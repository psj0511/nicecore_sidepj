import 'server-only'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { NotionConfig } from '@/types'

export async function getNotionConfig(): Promise<NotionConfig | null> {
  const { data, error } = await getSupabaseServer()
    .from('notion_configs')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Notion 설정 조회 실패: ${error.message}`)
  return data as NotionConfig | null
}

/** 단일 행 유지: 있으면 갱신, 없으면 생성 */
export async function saveNotionConfig(
  input: Omit<NotionConfig, 'id'>
): Promise<NotionConfig> {
  const db = getSupabaseServer()
  const existing = await getNotionConfig()
  const query = existing
    ? db.from('notion_configs').update(input).eq('id', existing.id)
    : db.from('notion_configs').insert(input)
  const { data, error } = await query.select().single()
  if (error) throw new Error(`Notion 설정 저장 실패: ${error.message}`)
  return data as NotionConfig
}

/** 클라이언트 전달용 마스킹 */
export function maskToken(token: string) {
  return token.length <= 8
    ? '••••'
    : `${token.slice(0, 4)}••••${token.slice(-4)}`
}
