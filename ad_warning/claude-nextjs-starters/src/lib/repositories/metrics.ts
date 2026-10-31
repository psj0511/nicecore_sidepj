import 'server-only'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { AdMetric } from '@/types'

export type NewAdMetric = Omit<AdMetric, 'id'>

const CHUNK = 1000

/** 동일 sync의 기존 지표를 교체한다 (재동기화) */
export async function replaceMetrics(
  syncId: string,
  rows: Omit<NewAdMetric, 'sync_id'>[]
): Promise<void> {
  const db = getSupabaseServer()
  const { error: delError } = await db
    .from('ad_metrics')
    .delete()
    .eq('sync_id', syncId)
  if (delError) throw new Error(`기존 지표 삭제 실패: ${delError.message}`)

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(r => ({ ...r, sync_id: syncId }))
    const { error } = await db.from('ad_metrics').insert(chunk)
    if (error) throw new Error(`지표 저장 실패: ${error.message}`)
  }
}

export async function listMetrics(range: {
  from: string
  to: string
}): Promise<AdMetric[]> {
  const pageSize = 1000
  const all: AdMetric[] = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await getSupabaseServer()
      .from('ad_metrics')
      .select('*')
      .gte('date', range.from)
      .lte('date', range.to)
      .order('date', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(`지표 조회 실패: ${error.message}`)
    all.push(...(data as AdMetric[]))
    if (data.length < pageSize) break
  }
  return all
}
