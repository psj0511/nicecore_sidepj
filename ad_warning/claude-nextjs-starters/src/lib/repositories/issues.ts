import 'server-only'
import { queryAll, getNotion } from '@/lib/notion/client'
import { getStorePage, propsOf } from '@/lib/notion/pages'
import { read, write } from '@/lib/notion/props'
import { getStore } from '@/lib/notion/store'
import type { Issue, IssueStatus, Severity } from '@/types'
import type { PageObjectResponse } from '@notionhq/client'

export interface IssueQuery {
  status?: IssueStatus
  severity?: Severity
  /** 최근 N일 이내 감지 */
  days?: number
}

function toIssue(page: PageObjectResponse): Issue {
  const p = propsOf(page)
  return {
    id: page.id,
    rule_id: read.text(p, '규칙'),
    source_id: read.text(p, '원본DB'),
    target: read.text(p, '대상'),
    target_date: read.date(p, '대상일') ?? '',
    detection_key: read.title(p, '감지키'),
    severity: (read.select(p, '심각도') ?? 'medium') as Severity,
    status: (read.select(p, '상태') ?? 'new') as IssueStatus,
    baseline_value: read.num(p, '기준값'),
    actual_value: read.num(p, '실제값'),
    weekend_note: read.textOrNull(p, '주말메모'),
    memo: read.textOrNull(p, '메모'),
    detected_at: read.date(p, '감지일시') ?? page.created_time,
    notion_url: read.url(p, '티켓URL'),
  }
}

export async function listIssues(q: IssueQuery = {}): Promise<Issue[]> {
  const store = await getStore()
  const and: object[] = []
  if (q.status) and.push({ property: '상태', select: { equals: q.status } })
  if (q.severity)
    and.push({ property: '심각도', select: { equals: q.severity } })
  if (q.days) {
    const since = new Date(Date.now() - q.days * 86_400_000).toISOString()
    and.push({ property: '감지일시', date: { on_or_after: since } })
  }
  const pages = await queryAll({
    data_source_id: store.issues,
    filter: and.length ? ({ and } as never) : undefined,
    sorts: [{ property: '감지일시', direction: 'descending' }],
  })
  return pages.map(toIssue)
}

export async function getIssue(id: string): Promise<Issue | null> {
  const page = await getStorePage('issues', id)
  return page ? toIssue(page) : null
}

export async function updateIssue(
  id: string,
  patch: Partial<Pick<Issue, 'status' | 'memo' | 'notion_url'>>
): Promise<Issue> {
  if (!(await getStorePage('issues', id))) {
    throw new Error('이슈를 찾을 수 없습니다')
  }
  const properties: Record<string, object> = {}
  if (patch.status !== undefined)
    properties['상태'] = write.select(patch.status)
  if (patch.memo !== undefined) properties['메모'] = write.text(patch.memo)
  if (patch.notion_url !== undefined)
    properties['티켓URL'] = write.url(patch.notion_url)
  const page = await getNotion().pages.update({
    page_id: id,
    properties: properties as never,
  })
  return toIssue(page as PageObjectResponse)
}

/**
 * detection_key 중복은 무시한다. Notion에는 유니크 제약이 없으므로
 * 기존 키를 한 번 읽어 비교한다. 새로 생성된 건수를 반환한다.
 * (동시 실행 시 중복 가능 — 감지는 한 번에 하나만 실행한다는 전제)
 */
export async function insertIssuesIgnoreDuplicates(
  rows: Omit<Issue, 'id' | 'detected_at' | 'status' | 'memo' | 'notion_url'>[]
): Promise<number> {
  if (rows.length === 0) return 0
  const store = await getStore()
  const existing = new Set(
    (
      await queryAll({
        data_source_id: store.issues,
        filter_properties: ['title'],
      })
    ).map(p => read.title(propsOf(p), '감지키'))
  )
  const notion = getNotion()
  const now = new Date().toISOString()
  let created = 0
  for (const r of rows) {
    if (existing.has(r.detection_key)) continue
    existing.add(r.detection_key)
    await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: store.issues },
      properties: {
        감지키: write.title(r.detection_key),
        규칙: write.text(r.rule_id),
        원본DB: write.text(r.source_id),
        대상: write.text(r.target),
        대상일: write.date(r.target_date),
        심각도: write.select(r.severity),
        상태: write.select('new'),
        기준값: write.num(r.baseline_value),
        실제값: write.num(r.actual_value),
        주말메모: write.text(r.weekend_note),
        감지일시: write.date(now),
      } as never,
    })
    created++
  }
  return created
}
