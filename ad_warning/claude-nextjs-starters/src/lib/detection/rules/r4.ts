import type { RuleEvaluator } from '@/types'
import { compare, gte, hit, pass, round, skip, threshold } from './common'

/** R4 전환 0: 당일 비용 ≥ 100,000 그리고 전환 0 그리고 기준일 전환 ≥ 1 */
export const evaluateR4: RuleEvaluator = ctx => {
  const c = compare(ctx)
  if (!c.ok) return skip(c.reason)
  // 이 규칙의 최소 규모는 대상일(당일) 비용 기준이다
  if (c.target.spend < threshold(ctx, 'minSpend')) {
    return skip('당일 비용 최소 규모 미달')
  }

  if (c.target.conversions !== 0) return pass()
  if (!gte(c.baseline.conversions, threshold(ctx, 'minBaselineConversions'))) {
    return pass()
  }
  return hit(ctx, { baseline: round(c.baseline.conversions), actual: 0 })
}
