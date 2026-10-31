import { describe, expect, it } from 'vitest'
import { detect } from './engine'
import { addDays } from './calendar'
import { makeRule, row } from './rules/test-utils'
import type { AdMetric, RuleCode } from '@/types'

const CODES: RuleCode[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']

/** 캠페인 N개 × 90일(대시보드 읽기 범위 상한) 합성 데이터 */
function makeMetrics(campaigns: number, days: number): AdMetric[] {
  const out: AdMetric[] = []
  const last = '2026-11-04'
  for (let c = 0; c < campaigns; c++) {
    for (let d = 0; d < days; d++) {
      out.push(
        row(addDays(last, -d), {
          campaign: `camp-${c}`,
          channel: c % 2 ? 'naver' : 'google',
          ad_group: c % 2 ? `grp-${c}` : null,
          spend: 100_000 + ((c * 31 + d * 17) % 50_000),
        })
      )
    }
  }
  return out
}

describe('감지 엔진 성능', () => {
  it('90일 × 1,000개 캠페인(약 9만 행)을 5초 안에 평가한다', () => {
    const metrics = makeMetrics(1000, 90)
    const rules = CODES.map(c => makeRule(c))
    const t0 = performance.now()
    const run = detect(metrics, rules)
    const ms = performance.now() - t0
    expect(run.evaluated + run.skipped).toBeGreaterThan(0)
    expect(ms).toBeLessThan(5000)
  })
})
