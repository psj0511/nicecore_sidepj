import 'server-only'
import { Client } from '@notionhq/client'
import { env } from '@/lib/env'

let client: Client | undefined

/** 서버 전용 Notion 클라이언트. 429·5xx는 SDK 내장 재시도(지수 백오프)로 처리한다 */
export function getNotion(): Client {
  if (client) return client
  if (!env.NOTION_TOKEN) {
    throw new Error('NOTION_TOKEN 환경 변수를 .env.local에 설정하세요.')
  }
  client = new Client({
    auth: env.NOTION_TOKEN,
    retry: { maxRetries: 4, initialRetryDelayMs: 500 },
  })
  return client
}

export function getParentPageId(): string {
  if (!env.NOTION_PARENT_PAGE_ID) {
    throw new Error(
      'NOTION_PARENT_PAGE_ID 환경 변수를 .env.local에 설정하세요.'
    )
  }
  return env.NOTION_PARENT_PAGE_ID
}

type QueryParams = Parameters<Client['dataSources']['query']>[0]

/** 페이지네이션을 끝까지 순회해 모든 페이지를 반환한다 */
export async function queryAll(
  params: Omit<QueryParams, 'start_cursor' | 'page_size'>
) {
  const notion = getNotion()
  const pages = []
  let cursor: string | undefined
  do {
    const res = await notion.dataSources.query({
      ...params,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const r of res.results) {
      if (r.object === 'page' && 'properties' in r) pages.push(r)
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return pages
}
