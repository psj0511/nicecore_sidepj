import 'server-only'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { DataSync } from '@/types'

export async function listSyncs(): Promise<DataSync[]> {
  const { data, error } = await getSupabaseServer()
    .from('data_syncs')
    .select('*')
    .order('synced_at', { ascending: false })
  if (error) throw new Error(`동기화 이력 조회 실패: ${error.message}`)
  return data as DataSync[]
}

/** notion_database_id 기준 upsert (재동기화 시 동일 행 갱신) */
export async function upsertSync(
  input: Omit<DataSync, 'id' | 'synced_at'>
): Promise<DataSync> {
  const { data, error } = await getSupabaseServer()
    .from('data_syncs')
    .upsert(
      { ...input, synced_at: new Date().toISOString() },
      { onConflict: 'notion_database_id' }
    )
    .select()
    .single()
  if (error) throw new Error(`동기화 저장 실패: ${error.message}`)
  return data as DataSync
}

/** 삭제 시 ad_metrics·issues는 FK cascade로 함께 정리 */
export async function deleteSync(id: string): Promise<void> {
  const { error } = await getSupabaseServer()
    .from('data_syncs')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`동기화 삭제 실패: ${error.message}`)
}
