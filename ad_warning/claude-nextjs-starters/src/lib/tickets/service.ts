import 'server-only'
import { APIErrorCode, isNotionClientError } from '@notionhq/client'
import { env } from '@/lib/env'
import { getNotion, getParentPageId } from '@/lib/notion/client'
import { getIssue, updateIssue } from '@/lib/repositories/issues'
import { listRules } from '@/lib/repositories/rules'
import { buildTicketProperties, findSchemaProblems } from './format'

/** Notion API 오류를 사용자에게 보여줄 한국어 안내로 바꾼다 */
export function describeNotionError(
  e: unknown,
  target: '티켓 데이터베이스' | '부모 페이지' = '티켓 데이터베이스'
): string {
  if (isNotionClientError(e)) {
    switch (e.code) {
      case APIErrorCode.Unauthorized:
        return 'Notion 토큰이 올바르지 않습니다. NOTION_TOKEN을 확인하세요'
      case APIErrorCode.RestrictedResource:
        return `이 Notion 통합에 권한이 없습니다. ${target}에 통합을 연결하세요`
      case APIErrorCode.ObjectNotFound:
        return target === '부모 페이지'
          ? '부모 페이지를 찾을 수 없습니다. NOTION_PARENT_PAGE_ID와 통합 연결을 확인하세요'
          : '티켓 데이터베이스를 찾을 수 없습니다. NOTION_DATABASE_ID와 통합 연결을 확인하세요'
      case APIErrorCode.ValidationError:
        return `티켓 데이터베이스 속성이 맞지 않습니다: ${e.message}`
      case APIErrorCode.RateLimited:
        return 'Notion 요청이 많아 잠시 후 다시 시도해야 합니다'
      default:
        return `Notion 오류: ${e.message}`
    }
  }
  return e instanceof Error ? e.message : 'Notion 요청에 실패했습니다'
}

export function isNotionConfigured() {
  return Boolean(env.NOTION_TOKEN && env.NOTION_DATABASE_ID)
}

async function loadTicketSchema() {
  const notion = getNotion()
  const db = await notion.databases.retrieve({
    database_id: env.NOTION_DATABASE_ID!,
  })
  const dataSourceId = 'data_sources' in db ? db.data_sources[0]?.id : undefined
  if (!dataSourceId) throw new Error('티켓 데이터베이스를 읽을 수 없습니다')
  const ds = await notion.dataSources.retrieve({ data_source_id: dataSourceId })
  return {
    dataSourceId,
    properties: ds.properties as Record<string, { type: string }>,
  }
}

// 같은 이슈에 대한 동시 생성 요청은 하나로 합친다 (더블클릭·중복 요청 방지)
const inflight = new Map<string, Promise<string>>()

/**
 * 이슈로 Notion 티켓을 만들고 URL 을 이슈에 저장한다.
 * 이미 티켓이 있으면 새로 만들지 않고 기존 URL 을 반환한다.
 */
export function createTicketForIssue(issueId: string): Promise<string> {
  const running = inflight.get(issueId)
  if (running) return running
  const p = doCreate(issueId).finally(() => inflight.delete(issueId))
  inflight.set(issueId, p)
  return p
}

async function doCreate(issueId: string): Promise<string> {
  if (!isNotionConfigured()) throw new Error('Notion 연동이 필요합니다')
  const issue = await getIssue(issueId)
  if (!issue) throw new Error('이슈를 찾을 수 없습니다')
  if (issue.notion_url) return issue.notion_url

  const { dataSourceId, properties } = await loadTicketSchema()
  const problems = findSchemaProblems(properties)
  if (problems.length > 0) throw new Error(problems.join(' / '))

  const rule = (await listRules()).find(r => r.id === issue.rule_id)
  const page = await getNotion().pages.create({
    parent: { type: 'data_source_id', data_source_id: dataSourceId },
    properties: buildTicketProperties(issue, rule) as never,
  })
  const url = 'url' in page ? page.url : undefined
  if (!url) throw new Error('생성된 티켓 URL을 확인할 수 없습니다')
  await updateIssue(issueId, { notion_url: url })
  return url
}

export interface ConnectionCheck {
  label: string
  ok: boolean
  note?: string
}

/** 토큰 → 부모 페이지 → 하위 DB → 티켓 DB 속성 순으로 확인한다 */
export async function testNotionConnection(): Promise<ConnectionCheck[]> {
  const checks: ConnectionCheck[] = []
  if (!env.NOTION_TOKEN) {
    return [
      {
        label: '토큰 설정',
        ok: false,
        note: 'NOTION_TOKEN 환경 변수를 .env.local에 설정하세요',
      },
    ]
  }
  const notion = getNotion()

  try {
    await notion.users.me({})
    checks.push({ label: '토큰 유효성', ok: true })
  } catch (e) {
    return [{ label: '토큰 유효성', ok: false, note: describeNotionError(e) }]
  }

  if (!env.NOTION_PARENT_PAGE_ID) {
    checks.push({
      label: '부모 페이지 접근',
      ok: false,
      note: 'NOTION_PARENT_PAGE_ID 환경 변수를 설정하세요',
    })
  } else {
    try {
      await notion.pages.retrieve({ page_id: getParentPageId() })
      checks.push({ label: '부모 페이지 접근', ok: true })
      let count = 0
      let cursor: string | undefined
      do {
        const res = await notion.blocks.children.list({
          block_id: getParentPageId(),
          start_cursor: cursor,
          page_size: 100,
        })
        count += res.results.filter(
          b => 'type' in b && b.type === 'child_database'
        ).length
        cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
      } while (cursor)
      checks.push({ label: `하위 데이터베이스 ${count}개 발견`, ok: count > 0 })
    } catch (e) {
      checks.push({
        label: '부모 페이지 접근',
        ok: false,
        note: describeNotionError(e, '부모 페이지'),
      })
    }
  }

  if (!env.NOTION_DATABASE_ID) {
    checks.push({
      label: '티켓 데이터베이스 속성 일치',
      ok: false,
      note: 'NOTION_DATABASE_ID 환경 변수를 설정하세요',
    })
  } else {
    try {
      const { properties } = await loadTicketSchema()
      const problems = findSchemaProblems(properties)
      checks.push({
        label: '티켓 데이터베이스 속성 일치',
        ok: problems.length === 0,
        note: problems.join(' / ') || undefined,
      })
    } catch (e) {
      checks.push({
        label: '티켓 데이터베이스 속성 일치',
        ok: false,
        note: describeNotionError(e),
      })
    }
  }
  return checks
}
