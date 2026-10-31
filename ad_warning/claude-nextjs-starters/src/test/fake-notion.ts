import { APIErrorCode, APIResponseError } from '@notionhq/client'
import { RULE_DEFAULTS } from '@/lib/detection/rules.config'
import { RULE_CODES } from '@/types'

/**
 * 통합 테스트용 인메모리 Notion. 앱이 쓰는 API(블록 목록, 데이터베이스·데이터 소스,
 * 페이지 생성·수정·조회, 쿼리)만 흉내 낸다.
 */
type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export const IDS = {
  parent: '11111111-1111-4111-8111-111111111111',
  rulesDs: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  issuesDs: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  ticketDb: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  ticketDs: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
} as const

export function notionError(code: APIErrorCode, status: number, msg = code) {
  return new APIResponseError({
    code,
    status,
    message: msg,
    headers: {},
    rawBodyText: '',
    additional_data: undefined,
    request_id: undefined,
  })
}

const rich = (v: string) => [
  { type: 'text', text: { content: v }, plain_text: v },
]

/** 쓰기 형식({title:[...]}, {select:{...}})에 type 과 plain_text 를 붙여 읽기 형식으로 */
function toStored(props: Json): Json {
  const out: Json = {}
  for (const [name, value] of Object.entries(props)) {
    const type = Object.keys(value)[0]!
    const v = { ...value, type }
    if (type === 'title' || type === 'rich_text') {
      v[type] = (value[type] as Json[]).map(i => ({
        ...i,
        plain_text: i.text.content,
      }))
    }
    out[name] = v
  }
  return out
}

export class FakeNotion {
  private seq = 0
  pages = new Map<string, Json>()
  /** 부모 페이지 하위 child_database 블록 (표시 순서) */
  children: { id: string; title: string }[] = []
  /** database id → data source id */
  private dsOfDb = new Map<string, string>()
  /** data source id → 속성 스키마 */
  schemas = new Map<string, Json>()
  /** 호출 시 던질 오류. 키는 'pages.create' 처럼 메서드 또는 'dataSources.query:<id>' */
  private failures = new Map<string, { err: unknown; always: boolean }>()
  calls: string[] = []
  ticketSchema: Json = {
    제목: { type: 'title' },
    규칙: { type: 'rich_text' },
    대상: { type: 'rich_text' },
    심각도: { type: 'select' },
    '감지 근거': { type: 'rich_text' },
    감지일: { type: 'date' },
  }

  constructor() {
    this.addDatabase(IDS.ticketDb, '광고 이상 감지 티켓', IDS.ticketDs)
    this.seedRules()
    this.pages.set(IDS.parent, { object: 'page', id: IDS.parent })
  }

  nextId() {
    const n = String(++this.seq).padStart(12, '0')
    return `00000000-0000-4000-8000-${n}`
  }

  addDatabase(dbId: string, title: string, dsId: string) {
    this.children.push({ id: dbId, title })
    this.dsOfDb.set(dbId, dsId)
  }

  /** 성과 DB 를 만들고 행(읽기 형식 속성)을 채운다 */
  addSource(title: string, rows: Json[]) {
    const dbId = this.nextId()
    const dsId = this.nextId()
    this.addDatabase(dbId, title, dsId)
    const ids = rows.map(props => this.insertRaw(dsId, props))
    return { dbId, dsId, rowIds: ids }
  }

  private insertRaw(dsId: string, properties: Json) {
    const id = this.nextId()
    this.pages.set(id, {
      object: 'page',
      id,
      created_time: new Date().toISOString(),
      in_trash: false,
      url: `https://notion.test/${id.replace(/-/g, '')}`,
      parent: { type: 'data_source_id', data_source_id: dsId },
      properties,
    })
    return id
  }

  private seedRules() {
    for (const code of RULE_CODES) {
      const d = RULE_DEFAULTS[code]
      this.insertRaw(
        IDS.rulesDs,
        toStored({
          규칙코드: { title: [{ type: 'text', text: { content: code } }] },
          유형: { rich_text: [{ type: 'text', text: { content: d.type } }] },
          심각도: { select: { name: d.severity } },
          임계값: {
            rich_text: [
              { type: 'text', text: { content: JSON.stringify(d.threshold) } },
            ],
          },
          목표값: { number: null },
          목표유형: { select: null },
          활성: { checkbox: d.stage === 1 },
          단계: { number: d.stage },
        })
      )
    }
  }

  pagesIn(dsId: string) {
    return [...this.pages.values()].filter(
      p => p.parent?.data_source_id === dsId
    )
  }

  /** 다음 호출(always 면 이후 모든 호출)에서 오류를 던지게 한다 */
  fail(key: string, err: unknown, always = false) {
    this.failures.set(key, { err, always })
  }

  clearFailures() {
    this.failures.clear()
  }

  private check(name: string) {
    this.calls.push(name)
    for (const key of [name, name.split(':')[0]!]) {
      const f = this.failures.get(key)
      if (!f) continue
      if (!f.always) this.failures.delete(key)
      throw f.err
    }
  }

  /** 앱이 getNotion() 으로 받는 클라이언트 */
  client = {
    users: { me: async () => (this.check('users.me'), { id: 'bot' }) },
    blocks: {
      children: {
        list: async () => {
          this.check('blocks.children.list')
          return {
            results: this.children.map(c => ({
              id: c.id,
              type: 'child_database',
              child_database: { title: c.title },
            })),
            has_more: false,
            next_cursor: null,
          }
        },
      },
    },
    databases: {
      retrieve: async ({ database_id }: { database_id: string }) => {
        this.check('databases.retrieve:' + database_id)
        const ds = this.dsOfDb.get(database_id)
        if (!ds) throw notionError(APIErrorCode.ObjectNotFound, 404)
        return { id: database_id, data_sources: [{ id: ds }] }
      },
    },
    dataSources: {
      retrieve: async ({ data_source_id }: { data_source_id: string }) => {
        this.check('dataSources.retrieve')
        const properties =
          data_source_id === IDS.ticketDs
            ? this.ticketSchema
            : (this.schemas.get(data_source_id) ?? {})
        return { id: data_source_id, properties }
      },
      query: async (p: Json) => {
        this.check('dataSources.query:' + p.data_source_id)
        let rows = this.pagesIn(p.data_source_id)
        for (const f of p.filter?.and ?? []) {
          if (f.select) {
            rows = rows.filter(
              r => r.properties[f.property]?.select?.name === f.select.equals
            )
          }
          if (f.date?.on_or_after) {
            rows = rows.filter(
              r =>
                (r.properties[f.property]?.date?.start ?? '') >=
                f.date.on_or_after
            )
          }
        }
        const sort = p.sorts?.[0]
        if (sort) {
          const key = (r: Json) =>
            r.properties[sort.property]?.date?.start ?? ''
          rows = [...rows].sort((a, b) => key(b).localeCompare(key(a)))
        }
        return { results: rows, has_more: false, next_cursor: null }
      },
    },
    pages: {
      create: async (p: Json) => {
        this.check('pages.create')
        const id = this.insertRaw(
          p.parent.data_source_id,
          toStored(p.properties)
        )
        return this.pages.get(id)!
      },
      retrieve: async ({ page_id }: { page_id: string }) => {
        this.check('pages.retrieve')
        const page = this.pages.get(page_id)
        if (!page) throw notionError(APIErrorCode.ObjectNotFound, 404)
        return page
      },
      update: async (p: Json) => {
        this.check('pages.update')
        const page = this.pages.get(p.page_id)
        if (!page) throw notionError(APIErrorCode.ObjectNotFound, 404)
        if (p.in_trash !== undefined) page.in_trash = p.in_trash
        if (p.properties) Object.assign(page.properties, toStored(p.properties))
        return page
      },
    },
  }
}

/** 성과 DB 한 행 (읽기 형식). 값을 덮어쓰거나 속성을 빼서 오류 행을 만든다 */
export function metricRow(
  date: string,
  o: {
    campaign?: string
    channel?: string
    spend?: number | string
    impressions?: number | string
    clicks?: number | string
    conversions?: number | string
    revenue?: number | string
    omit?: string[]
  } = {}
): Json {
  const num = (v: number | string | undefined, d: number) => {
    const val = v ?? d
    return typeof val === 'number'
      ? { type: 'number', number: val }
      : { type: 'rich_text', rich_text: rich(val) }
  }
  const props: Json = {
    날짜: { type: 'date', date: { start: date } },
    채널: { type: 'select', select: { name: o.channel ?? '구글' } },
    캠페인: { type: 'title', title: rich(o.campaign ?? '브랜드 검색') },
    광고비: num(o.spend, 200_000),
    노출: num(o.impressions, 10_000),
    클릭: num(o.clicks, 500),
    전환: num(o.conversions, 10),
    매출: num(o.revenue, 1_000_000),
  }
  for (const k of o.omit ?? []) delete props[k]
  return props
}

export { rich }
