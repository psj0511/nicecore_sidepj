import 'server-only'
import { RULE_DEFAULTS } from '@/lib/detection/rules.config'
import { RULE_CODES } from '@/types'
import { getNotion, getParentPageId, queryAll } from './client'
import { write } from './props'

/**
 * 앱 데이터용 Notion DB 2개 (부모 페이지 하위에 자동 생성).
 * 성과 데이터 탐색(child_database 순회) 시 이 제목들은 반드시 제외해야 한다.
 */
export const STORE_TITLES = {
  rules: '[AD] 감지 규칙',
  issues: '[AD] 이슈',
} as const
export type StoreKey = keyof typeof STORE_TITLES

export const isStoreTitle = (title: string) =>
  (Object.values(STORE_TITLES) as string[]).includes(title)

const SELECT = (names: string[]) => ({
  select: { options: names.map(name => ({ name })) },
})

const SCHEMAS: Record<StoreKey, Record<string, object>> = {
  rules: {
    규칙코드: { title: {} },
    유형: { rich_text: {} },
    심각도: SELECT(['critical', 'high', 'medium']),
    임계값: { rich_text: {} },
    목표값: { number: {} },
    목표유형: SELECT(['cpa', 'roas']),
    활성: { checkbox: {} },
    단계: { number: {} },
  },
  issues: {
    감지키: { title: {} },
    규칙: { rich_text: {} },
    원본DB: { rich_text: {} },
    대상: { rich_text: {} },
    대상일: { date: {} },
    심각도: SELECT(['critical', 'high', 'medium']),
    상태: SELECT(['new', 'in_progress', 'resolved', 'ignored']),
    기준값: { number: {} },
    실제값: { number: {} },
    주말메모: { rich_text: {} },
    메모: { rich_text: {} },
    감지일시: { date: {} },
    티켓URL: { url: {} },
  },
}

let storePromise: Promise<Record<StoreKey, string>> | undefined

/** 2개 DB의 data source ID를 반환한다. 없으면 생성하고 규칙 R1~R8을 시드한다 */
export function getStore() {
  storePromise ??= initStore().catch(e => {
    storePromise = undefined
    throw e
  })
  return storePromise
}

async function listChildDatabases(parentId: string) {
  const notion = getNotion()
  const found = new Map<string, string>()
  let cursor: string | undefined
  do {
    const res = await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const b of res.results) {
      if ('type' in b && b.type === 'child_database') {
        found.set(b.child_database.title, b.id)
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return found
}

async function dataSourceIdOf(databaseId: string) {
  const db = await getNotion().databases.retrieve({ database_id: databaseId })
  const id = 'data_sources' in db ? db.data_sources[0]?.id : undefined
  if (!id) throw new Error('Notion 데이터 소스를 찾을 수 없습니다')
  return id
}

async function initStore() {
  const notion = getNotion()
  const parentId = getParentPageId()
  const existing = await listChildDatabases(parentId)
  const ids = {} as Record<StoreKey, string>

  for (const key of Object.keys(STORE_TITLES) as StoreKey[]) {
    const title = STORE_TITLES[key]
    const dbId = existing.get(title)
    if (dbId) {
      ids[key] = await dataSourceIdOf(dbId)
      continue
    }
    const db = await notion.databases.create({
      parent: { type: 'page_id', page_id: parentId },
      title: [{ type: 'text', text: { content: title } }],
      initial_data_source: { properties: SCHEMAS[key] as never },
    })
    ids[key] = await dataSourceIdOf(db.id)
  }

  await seedRules(ids.rules)
  return ids
}

/** 누락된 규칙만 생성 (기본 R1~R8) */
async function seedRules(rulesSourceId: string) {
  const pages = await queryAll({ data_source_id: rulesSourceId })
  const have = new Set(
    pages.map(p => {
      const t = (
        p.properties as Record<string, { title?: { plain_text: string }[] }>
      )['규칙코드']
      return t?.title?.[0]?.plain_text
    })
  )
  const notion = getNotion()
  for (const code of RULE_CODES) {
    if (have.has(code)) continue
    const d = RULE_DEFAULTS[code]
    await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: rulesSourceId },
      properties: {
        규칙코드: write.title(code),
        유형: write.text(d.type),
        심각도: write.select(d.severity),
        임계값: write.text(JSON.stringify(d.threshold)),
        목표값: write.num(null),
        목표유형: write.select(null),
        활성: write.checkbox(d.stage === 1),
        단계: write.num(d.stage),
      } as never,
    })
  }
}
