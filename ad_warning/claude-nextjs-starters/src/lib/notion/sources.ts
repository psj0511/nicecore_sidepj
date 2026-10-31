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
/** 대시보드·감지가 읽는 범위: 데이터의 최신 날짜 기준 최근 N일 (비교 기간 포함 여유분) */
export const METRIC_WINDOW_DAYS = 90

export interface SourceDatabase {
  /** child_database 블록 ID (= database ID) */
  id: string
  title: string
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
  return out
}

/** 하위 DB 목록도 짧게 캐시해 페이지 요청마다 Notion을 호출하지 않는다 */
export const listSourceDatabases = unstable_cache(
  fetchSourceDatabases,
  ['notion-source-list'],
  { revalidate: SOURCE_CACHE_SECONDS, tags: [SOURCE_CACHE_TAG] }
)

/** Notion 한도(초당 ~3건) 초과를 피하기 위한 동시 조회 DB 수 */
const SOURCE_CONCURRENCY = 2

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

async function loadSource(
  database: SourceDatabase,
  windowDays?: number
): Promise<SourceSnapshot> {
  const notion = getNotion()
  const db = await notion.databases.retrieve({ database_id: database.id })
  const dataSourceId = 'data_sources' in db ? db.data_sources[0]?.id : undefined
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

  const filter = windowDays
    ? await windowFilter(dataSourceId, windowDays)
    : undefined
  const pages = await queryAll({
    data_source_id: dataSourceId,
    filter: filter as never,
  })
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

/** 성과 DB 한 개를 실시간(짧은 캐시)으로 읽는다. 검증 오류 행은 제외하고 오류로 보고한다 */
export const readSource = unstable_cache(loadSource, ['notion-source'], {
  revalidate: SOURCE_CACHE_SECONDS,
  tags: [SOURCE_CACHE_TAG],
})

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
