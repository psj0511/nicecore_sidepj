import 'server-only'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { DetectionRule, R5TargetType, RuleThreshold } from '@/types'

export async function listRules(): Promise<DetectionRule[]> {
  const { data, error } = await getSupabaseServer()
    .from('detection_rules')
    .select('*')
    .order('rule_code', { ascending: true })
  if (error) throw new Error(`규칙 조회 실패: ${error.message}`)
  return data as DetectionRule[]
}

export interface RuleUpdate {
  threshold: RuleThreshold
  target_type: R5TargetType | null
  target_value: number | null
  is_active: boolean
}

export async function updateRule(
  id: string,
  patch: RuleUpdate
): Promise<DetectionRule> {
  const { data, error } = await getSupabaseServer()
    .from('detection_rules')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`규칙 저장 실패: ${error.message}`)
  return data as DetectionRule
}
