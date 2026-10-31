import { z } from 'zod'
import { R5_TARGET_TYPES } from '@/types'

/** 규칙 설정 폼. threshold는 규칙별 키가 다르므로 숫자 레코드로 검증 */
export const ruleFormSchema = z.object({
  threshold: z.record(z.string(), z.number({ error: '숫자를 입력하세요' })),
  /** R5 전용 목표값 (CPA 원 / ROAS 배수) */
  targetType: z.enum(R5_TARGET_TYPES).optional(),
  targetValue: z
    .number({ error: '숫자를 입력하세요' })
    .positive('0보다 커야 합니다')
    .nullable()
    .optional(),
  isActive: z.boolean(),
})

export type RuleFormValues = z.infer<typeof ruleFormSchema>
