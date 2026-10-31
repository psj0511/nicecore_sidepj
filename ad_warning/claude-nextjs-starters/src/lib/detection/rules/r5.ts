import type { RuleEvaluator } from '@/types'
import {
  belowMinSpend,
  gte,
  hit,
  lte,
  pass,
  round,
  skip,
  targetDay,
  threshold,
} from './common'

/**
 * R5 CPA/ROAS 이탈 (목표값은 규칙 설정)
 * - 리드형: CPA ≥ 목표 × (1 + 30%)
 * - 이커머스형: ROAS ≤ 목표 × 0.7
 * 비교 기준이 직전 기간이 아니라 목표값이므로 대상일 데이터만 필요하다.
 */
export const evaluateR5: RuleEvaluator = ctx => {
  const { target_type: type, target_value: goal } = ctx.rule
  if (!type || goal === null || !(goal > 0)) return skip('R5 목표값 미설정')

  const day = targetDay(ctx)
  if (!day) return skip('대상일 데이터 없음')
  if (belowMinSpend(day.spend)) return skip('대상일 비용 최소 규모 미달')

  if (type === 'cpa') {
    if (day.conversions <= 0) return skip('전환 0 — CPA 계산 불가 (R4 영역)')
    const cpa = day.spend / day.conversions
    if (!gte(cpa, goal * (1 + threshold(ctx, 'cpaIncreaseRate')))) return pass()
    return hit(ctx, { baseline: round(goal), actual: round(cpa, 0) })
  }

  const roas = day.revenue / day.spend
  if (!lte(roas, goal * threshold(ctx, 'roasRatio'))) return pass()
  return hit(ctx, { baseline: round(goal), actual: round(roas) })
}
