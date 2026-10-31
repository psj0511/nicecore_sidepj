'use server'

import { revalidatePath } from 'next/cache'
import { updateRule } from '@/lib/repositories/rules'
import { listRules } from '@/lib/repositories/rules'
import { ruleFormSchema, type RuleFormValues } from '@/lib/validations/rule'

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function saveRuleAction(
  ruleId: string,
  values: RuleFormValues
): Promise<ActionResult> {
  const parsed = ruleFormSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }
  const v = parsed.data
  try {
    const rule = (await listRules()).find(r => r.id === ruleId)
    if (!rule) return { ok: false, error: '규칙을 찾을 수 없습니다' }
    // R7·R8(2단계)은 서버 측에서 활성화 차단
    if (rule.stage === 2 && v.isActive) {
      return { ok: false, error: '2단계 규칙은 활성화할 수 없습니다' }
    }
    await updateRule(ruleId, {
      threshold: v.threshold,
      target_type: rule.rule_code === 'R5' ? (v.targetType ?? null) : null,
      target_value: rule.rule_code === 'R5' ? (v.targetValue ?? null) : null,
      is_active: v.isActive,
    })
    revalidatePath('/rules')
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장 실패' }
  }
}
