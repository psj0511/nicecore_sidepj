import type { RuleEvaluator } from '@/types'
import {
  belowMinSpend,
  changeRate,
  compare,
  ctrPercent,
  gte,
  hit,
  lte,
  pass,
  round,
  skip,
  threshold,
} from './common'

/** R3 CTR 급락: CTR 변화율 ≤ -30% 그리고 기준일 노출 ≥ 3,000 */
export const evaluateR3: RuleEvaluator = ctx => {
  const c = compare(ctx)
  if (!c.ok) return skip(c.reason)
  if (belowMinSpend(c.baseline.spend)) return skip('기준일 비용 최소 규모 미달')
  if (!gte(c.baseline.impressions, threshold(ctx, 'minBaselineImpressions'))) {
    return skip('기준일 노출 최소 규모 미달')
  }
  // 노출이 0이면 CTR을 계산할 수 없다 (노출 급감은 R2 영역)
  if (c.target.impressions <= 0) return skip('대상일 노출 없음')

  const baseCtr = ctrPercent(c.baseline.clicks, c.baseline.impressions)
  const actualCtr = ctrPercent(c.target.clicks, c.target.impressions)
  if (baseCtr <= 0) return skip('기준일 CTR 0')

  const rate = changeRate(actualCtr, baseCtr)
  if (!lte(rate, threshold(ctx, 'ctrChangeRate'))) return pass()
  // 화면은 % 단위로 표시한다 (RULE_DISPLAY.R3)
  return hit(ctx, { baseline: round(baseCtr), actual: round(actualCtr) })
}
