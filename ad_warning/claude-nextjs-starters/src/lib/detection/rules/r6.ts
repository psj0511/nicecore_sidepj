import type { RuleEvaluator } from '@/types'
import {
  belowMinSpend,
  changeRate,
  compare,
  gte,
  hit,
  lte,
  pass,
  round,
  skip,
  threshold,
} from './common'

/** R6 클릭 급증: 클릭 변화율 ≥ +200% 그리고 전환 변화율 ≤ +20% */
export const evaluateR6: RuleEvaluator = ctx => {
  const c = compare(ctx)
  if (!c.ok) return skip(c.reason)
  if (belowMinSpend(c.baseline.spend)) return skip('기준일 비용 최소 규모 미달')
  if (c.baseline.clicks <= 0) return skip('기준일 클릭 없음')

  const clickRate = changeRate(c.target.clicks, c.baseline.clicks)
  if (!gte(clickRate, threshold(ctx, 'clickChangeRate'))) return pass()

  // 기준일 전환이 0이면 변화율을 나눌 수 없어 "전환이 늘지 않았는가"로 판단한다:
  // 대상일 전환 ≤ 기준일 전환 × (1 + 20%)
  const maxConversions =
    c.baseline.conversions * (1 + threshold(ctx, 'conversionChangeRate'))
  if (!lte(c.target.conversions, maxConversions)) return pass()

  return hit(ctx, {
    baseline: round(c.baseline.clicks),
    actual: round(c.target.clicks),
  })
}
