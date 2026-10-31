import type { RuleEvaluator } from '@/types'
import {
  belowMinSpend,
  changeRate,
  compare,
  hit,
  lte,
  pass,
  round,
  skip,
  threshold,
} from './common'

/** R2 노출 급감: 노출 변화율 ≤ -60% */
export const evaluateR2: RuleEvaluator = ctx => {
  const c = compare(ctx)
  if (!c.ok) return skip(c.reason)
  // 대상일 비용은 노출 급감 때 함께 사라지므로 기준일 비용으로 규모를 판단한다
  if (belowMinSpend(c.baseline.spend)) return skip('기준일 비용 최소 규모 미달')
  if (c.baseline.impressions <= 0) return skip('기준일 노출 없음')

  const rate = changeRate(c.target.impressions, c.baseline.impressions)
  if (!lte(rate, threshold(ctx, 'impressionChangeRate'))) return pass()
  return hit(ctx, {
    baseline: round(c.baseline.impressions),
    actual: round(c.target.impressions),
  })
}
