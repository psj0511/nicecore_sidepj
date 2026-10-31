import 'server-only'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { Issue, IssueStatus, Severity } from '@/types'

export interface IssueQuery {
  status?: IssueStatus
  severity?: Severity
  /** 최근 N일 이내 감지 */
  days?: number
}

export async function listIssues(q: IssueQuery = {}): Promise<Issue[]> {
  let query = getSupabaseServer()
    .from('issues')
    .select('*')
    .order('detected_at', { ascending: false })
  if (q.status) query = query.eq('status', q.status)
  if (q.severity) query = query.eq('severity', q.severity)
  if (q.days) {
    const since = new Date(Date.now() - q.days * 86_400_000).toISOString()
    query = query.gte('detected_at', since)
  }
  const { data, error } = await query
  if (error) throw new Error(`이슈 조회 실패: ${error.message}`)
  return data as Issue[]
}

export async function getIssue(id: string): Promise<Issue | null> {
  const { data, error } = await getSupabaseServer()
    .from('issues')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`이슈 조회 실패: ${error.message}`)
  return data as Issue | null
}

export async function updateIssue(
  id: string,
  patch: Partial<Pick<Issue, 'status' | 'memo' | 'notion_url'>>
): Promise<Issue> {
  const { data, error } = await getSupabaseServer()
    .from('issues')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`이슈 저장 실패: ${error.message}`)
  return data as Issue
}

/** detection_key 중복은 무시(upsert ignoreDuplicates). 새로 생성된 건수 반환 */
export async function insertIssuesIgnoreDuplicates(
  rows: Omit<Issue, 'id' | 'detected_at' | 'status' | 'memo' | 'notion_url'>[]
): Promise<number> {
  if (rows.length === 0) return 0
  const { data, error } = await getSupabaseServer()
    .from('issues')
    .upsert(rows, { onConflict: 'detection_key', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(`이슈 저장 실패: ${error.message}`)
  return data.length
}
