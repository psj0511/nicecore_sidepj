import type { RuleEvaluator } from '@/types'
import {
  belowMinSpend,
  changeRate,
  compare,
  gte,
  hit,
  pass,
  round,
  skip,
  threshold,
} from './common'

/** R1 비용 급증: 비용 변화율 ≥ +50% */
export const evaluateR1: RuleEvaluator = ctx => {
  const c = compare(ctx)
  if (!c.ok) return skip(c.reason)
  if (belowMinSpend(c.baseline.spend)) return skip('기준일 비용 최소 규모 미달')

  const rate = changeRate(c.target.spend, c.baseline.spend)
  if (!gte(rate, threshold(ctx, 'costChangeRate'))) return pass()
  return hit(ctx, {
    baseline: round(c.baseline.spend),
    actual: round(c.target.spend),
  })
}
