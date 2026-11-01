import 'server-only'
import { unstable_cache } from 'next/cache'
import { env } from '@/lib/env'
import { notionMetricRowSchema } from '@/lib/validations/notion-metric'
import type { AdMetric } from '@/types'
import { getNotion, getParentPageId, queryAll } from './client'
import {
  METRIC_PROPERTY_NAMES,
  OPTIONAL_METRIC_FIELDS,
  resolveMetricProperty,
  type MetricField,
} from './properties'
import { isStoreTitle } from './store'

/** 실시간 조회 결과 캐시 시간(초). 이 시간 안의 재조회는 Notion을 다시 호출하지 않는다 */
export const SOURCE_CACHE_SECONDS = 120
export const SOURCE_CACHE_TAG = 'notion-sources'
/** 지난 날짜 DB 전용 캐시. 수동 새로고침으로 비우지 않아 새로고침이 최근 DB만 다시 읽는다 */
const ARCHIVE_CACHE_TAG = 'notion-sources-archive'
const ARCHIVE_CACHE_SECONDS = 6 * 60 * 60
/** 제목 끝 날짜가 오늘보다 이 일수 이상 이전이면 지난 날짜 DB로 본다 */
const ARCHIVE_AFTER_DAYS = 2
/** 대시보드·감지가 읽는 범위: 데이터의 최신 날짜 기준 최근 N일 (비교 기간 포함 여유분) */
export const METRIC_WINDOW_DAYS = 90

export interface SourceDatabase {
  /** child_database 블록 ID (= database ID) */
  id: string
  title: string
  /** 목록 단계에서 확인한 데이터 소스 ID (없으면 조회 시 retrieve로 찾는다) */
  dataSourceId?: string
}

export interface SourceError {
  /** 1부터 시작하는 행 번호. 0이면 데이터베이스 전체 오류 */
  row: number
  reason: string
}

export interface SourceSnapshot {
  database: SourceDatabase
  /** 읽어 온 전체 행 수 (검증 실패 포함) */
  rowCount: number
  metrics: AdMetric[]
  errors: SourceError[]
  /** Notion에서 실제로 읽은 시각 (캐시 적중 시 과거 시각) */
  fetchedAt: string
}

const norm = (id: string) => id.replace(/-/g, '').toLowerCase()

/** 부모 페이지 하위 데이터베이스 중 앱 데이터 DB와 티켓 DB를 제외한 성과 DB 목록 */
async function fetchSourceDatabases(): Promise<SourceDatabase[]> {
  const notion = getNotion()
  const parentId = getParentPageId()
  const ticketId = env.NOTION_DATABASE_ID && norm(env.NOTION_DATABASE_ID)
  const out: SourceDatabase[] = []
  let cursor: string | undefined
  do {
    const res = await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const b of res.results) {
      if (!('type' in b) || b.type !== 'child_database') continue
      const title = b.child_database.title
      if (isStoreTitle(title) || norm(b.id) === ticketId) continue
      out.push({ id: b.id, title })
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  // DB와 데이터 소스의 연결은 거의 바뀌지 않으므로 목록과 함께 한 번에 확인해 캐시한다
  for (const db of out) {
    try {
      const d = await notion.databases.retrieve({ database_id: db.id })
      db.dataSourceId = 'data_sources' in d ? d.data_sources[0]?.id : undefined
    } catch {
      // 실패하면 조회 단계에서 다시 시도한다
    }
  }
  return out
}

/** 하위 DB 목록 캐시 시간(초). 새 DB는 이 시간 안에, 수동 새로고침 시에는 즉시 반영된다 */
const LIST_CACHE_SECONDS = 600

/** 하위 DB 목록·데이터 소스 ID를 캐시해 페이지 요청마다 Notion을 호출하지 않는다 */
export const listSourceDatabases = unstable_cache(
  fetchSourceDatabases,
  ['notion-source-list'],
  { revalidate: LIST_CACHE_SECONDS, tags: [SOURCE_CACHE_TAG] }
)

/** Notion 한도(초당 ~3건) 초과를 피하기 위한 동시 조회 DB 수 */
const SOURCE_CONCURRENCY = 3

type RawProp = Record<string, unknown> & { type: string }

/** Notion 속성 값을 검증 스키마가 받는 원시 값(문자열/숫자)으로 변환 */
function rawValue(prop: RawProp | undefined): string | number | undefined {
  if (!prop) return undefined
  const text = (items: unknown) =>
    Array.isArray(items)
      ? (items as { plain_text?: string }[])
          .map(i => i.plain_text ?? '')
          .join('')
      : ''
  switch (prop.type) {
    case 'title':
      return text(prop.title)
    case 'rich_text':
      return text(prop.rich_text)
    case 'number':
      return (prop.number as number | null) ?? undefined
    case 'select':
      return (prop.select as { name?: string } | null)?.name
    case 'date':
      return (prop.date as { start?: string } | null)?.start
    case 'formula': {
      const f = prop.formula as { string?: string; number?: number } | null
      return f?.string ?? f?.number ?? undefined
    }
    default:
      return undefined
  }
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * 날짜 속성이 Notion `date` 타입일 때만 최신 날짜 기준 N일 이전 행을 서버에서 걸러낸다.
 * 텍스트 날짜(CSV 가져오기)이거나 행이 없으면 undefined → 전체 조회
 */
async function windowFilter(dataSourceId: string, windowDays: number) {
  const notion = getNotion()
  const probe = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 1,
  })
  const first = probe.results[0]
  if (!first || !('properties' in first)) return undefined
  const name = resolveMetricProperty('date', first.properties)
  const prop = name ? first.properties[name] : undefined
  if (!name || prop?.type !== 'date') return undefined
  const latest = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 1,
    sorts: [{ property: name, direction: 'descending' }],
  })
  const top = latest.results[0]
  const topProp = top && 'properties' in top ? top.properties[name] : undefined
  const start = topProp?.type === 'date' ? topProp.date?.start : undefined
  if (!start || !/^\d{4}-\d{2}-\d{2}/.test(start)) return undefined
  return {
    and: [
      {
        property: name,
        date: { on_or_after: daysBefore(start, windowDays) },
      },
    ],
  }
}

/**
 * 이미 읽은 행에 `windowFilter`와 같은 기준(날짜 속성이 `date` 타입일 때만,
 * 최신 날짜 기준 N일 이내)을 적용한다. 전체가 한 페이지에 들어온 DB용
 */
function windowRows<T extends { properties: Record<string, unknown> }>(
  rows: T[],
  windowDays: number
): T[] {
  const first = rows[0]
  if (!first) return rows
  const name = resolveMetricProperty(
    'date',
    first.properties as Parameters<typeof resolveMetricProperty>[1]
  )
  const start = (row: T) => {
    const p = name ? (row.properties[name] as RawProp | undefined) : undefined
    return p?.type === 'date'
      ? (p.date as { start?: string } | null)?.start
      : undefined
  }
  if (!name || (first.properties[name] as RawProp | undefined)?.type !== 'date')
    return rows
  const dates = rows.map(start).filter((d): d is string => !!d)
  const latest = dates.sort().at(-1)
  if (!latest || !/^\d{4}-\d{2}-\d{2}/.test(latest)) return rows
  const cutoff = daysBefore(latest, windowDays)
  return rows.filter(r => {
    const d = start(r)
    return d !== undefined && d.slice(0, 10) >= cutoff
  })
}

async function loadSource(
  database: SourceDatabase,
  windowDays?: number
): Promise<SourceSnapshot> {
  const notion = getNotion()
  // 목록 단계에서 이미 확인한 데이터 소스 ID가 있으면 retrieve 호출을 생략한다
  let dataSourceId = database.dataSourceId
  if (!dataSourceId) {
    const db = await notion.databases.retrieve({ database_id: database.id })
    dataSourceId = 'data_sources' in db ? db.data_sources[0]?.id : undefined
  }
  const fetchedAt = new Date().toISOString()
  if (!dataSourceId) {
    return {
      database,
      rowCount: 0,
      metrics: [],
      errors: [{ row: 0, reason: '데이터 소스를 찾을 수 없습니다' }],
      fetchedAt,
    }
  }

  let pages: Awaited<ReturnType<typeof queryAll>>
  if (windowDays) {
    // 한 페이지(100행)에 다 들어오는 DB는 기간 필터용 탐색 조회(2회)가 필요 없다
    const first = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
    })
    if (!first.has_more) {
      pages = windowRows(
        first.results.filter(
          (r): r is Awaited<ReturnType<typeof queryAll>>[number] =>
            r.object === 'page' && 'properties' in r
        ),
        windowDays
      )
    } else {
      const filter = await windowFilter(dataSourceId, windowDays)
      pages = await queryAll({
        data_source_id: dataSourceId,
        filter: filter as never,
      })
    }
  } else {
    pages = await queryAll({ data_source_id: dataSourceId })
  }
  const fields = Object.keys(METRIC_PROPERTY_NAMES) as MetricField[]
  const errors: SourceError[] = []

  // 필수 속성이 없으면 행 단위 오류 수백 건 대신 한 건만 보고한다
  if (pages.length > 0) {
    const present = pages[0]!.properties
    for (const f of fields) {
      if (OPTIONAL_METRIC_FIELDS.includes(f)) continue
      if (!resolveMetricProperty(f, present)) {
        errors.push({
          row: 0,
          reason: `필수 속성 '${METRIC_PROPERTY_NAMES[f]}'이(가) 없습니다`,
        })
      }
    }
    if (errors.length > 0) {
      return {
        database,
        rowCount: pages.length,
        metrics: [],
        errors,
        fetchedAt,
      }
    }
  }

  // 첫 행 기준으로 필드별 실제 속성명을 확정한다 (별칭 포함)
  const firstProps = pages[0]?.properties ?? {}
  const propName = Object.fromEntries(
    fields.map(f => [
      f,
      resolveMetricProperty(f, firstProps) ?? METRIC_PROPERTY_NAMES[f],
    ])
  ) as Record<MetricField, string>

  const metrics: AdMetric[] = []
  pages.forEach((page, i) => {
    const props = page.properties as unknown as Record<string, RawProp>
    const raw = Object.fromEntries(
      fields.map(f => [f, rawValue(props[propName[f]])])
    )
    const parsed = notionMetricRowSchema.safeParse(raw)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const label = propName[issue?.path[0] as MetricField]
      errors.push({
        row: i + 1,
        reason: `'${label ?? '행'}': ${issue?.message ?? '형식 오류'}`,
      })
      return
    }
    const v = parsed.data
    metrics.push({
      id: page.id,
      source_id: database.id,
      date: v.date,
      channel: v.channel,
      campaign: v.campaign,
      ad_group: v.adGroup,
      spend: v.spend,
      impressions: v.impressions,
      clicks: v.clicks,
      conversions: v.conversions,
      revenue: v.revenue,
    })
  })

  return { database, rowCount: pages.length, metrics, errors, fetchedAt }
}

const readRecentSource = unstable_cache(loadSource, ['notion-source'], {
  revalidate: SOURCE_CACHE_SECONDS,
  tags: [SOURCE_CACHE_TAG],
})

const readArchivedSource = unstable_cache(
  loadSource,
  ['notion-source-archive'],
  {
    revalidate: ARCHIVE_CACHE_SECONDS,
    tags: [ARCHIVE_CACHE_TAG],
  }
)

/** 제목 끝에 붙은 보고 날짜(YYYY-MM-DD)가 충분히 지난 DB인지 */
function isArchived(title: string): boolean {
  const m = /(\d{4}-\d{2}-\d{2})\s*$/.exec(title)
  return !!m && m[1]! < daysBefore(new Date().toISOString(), ARCHIVE_AFTER_DAYS)
}

/** 성과 DB 한 개를 읽는다. 최근 DB는 짧은 캐시, 지난 날짜 DB는 긴 캐시. 검증 오류 행은 제외하고 오류로 보고한다 */
export function readSource(
  database: SourceDatabase,
  windowDays?: number
): Promise<SourceSnapshot> {
  return isArchived(database.title)
    ? readArchivedSource(database, windowDays)
    : readRecentSource(database, windowDays)
}

/** 모든 성과 DB를 읽는다. DB 하나가 실패해도 나머지는 계속 읽는다 */
export async function readAllSources(
  windowDays?: number
): Promise<SourceSnapshot[]> {
  const databases = await listSourceDatabases()
  const results: SourceSnapshot[] = new Array(databases.length)
  let next = 0
  // 워커 N개가 큐에서 하나씩 꺼내 처리 → 동시 요청 수 제한
  const worker = async () => {
    while (next < databases.length) {
      const i = next++
      const db = databases[i]!
      try {
        results[i] = await readSource(db, windowDays)
      } catch (e) {
        results[i] = {
          database: db,
          rowCount: 0,
          metrics: [],
          errors: [
            {
              row: 0,
              reason: e instanceof Error ? e.message : 'Notion 조회 실패',
            },
          ],
          fetchedAt: new Date().toISOString(),
        }
      }
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(SOURCE_CONCURRENCY, databases.length) },
      worker
    )
  )
  return results
}

/** 기간 내 지표를 모두 모아 반환한다 (감지·대시보드용) */
export async function listMetrics(
  range: { from: string; to: string },
  opts: { windowDays?: number } = {}
): Promise<AdMetric[]> {
  const snapshots = await readAllSources(opts.windowDays)
  return snapshots
    .flatMap(s => s.metrics)
    .filter(m => m.date >= range.from && m.date <= range.to)
    .sort((a, b) => a.date.localeCompare(b.date))
}
