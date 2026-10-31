import { describe, expect, it } from 'vitest'
import { evaluateR3 } from './r3'
import { context, twoDays } from './test-utils'

// 기준일 CTR = 500 / 10,000 = 5%
const run = (base: object, target: object) =>
  evaluateR3(context('R3', twoDays(base, target)))

describe('R3 CTR 급락', () => {
  it('CTR -30% 정확히는 위반이다 (경계)', () => {
    expect(run({}, { clicks: 350 })).toMatchObject({
      triggered: true,
      severity: 'medium',
      baselineValue: 5,
      actualValue: 3.5,
    })
  })

  it('CTR 하락이 -30% 보다 작으면 위반이 아니다', () => {
    expect(run({}, { clicks: 351 }).triggered).toBe(false)
  })

  it('기준일 노출 3,000 은 평가한다 (경계)', () => {
    const r = run(
      { impressions: 3_000, clicks: 150 },
      { impressions: 3_000, clicks: 100 }
    )
    expect(r).toMatchObject({ skipped: false, triggered: true })
  })

  it('기준일 노출 3,000 미만은 평가 제외다', () => {
    const r = run(
      { impressions: 2_999, clicks: 150 },
      { impressions: 3_000, clicks: 10 }
    )
    expect(r.skipped).toBe(true)
  })

  it('대상일 노출이 0이면 평가 제외다 (R2 영역)', () => {
    expect(run({}, { impressions: 0, clicks: 0 }).skipped).toBe(true)
  })

  it('기준일 비용 100,000원 미만은 평가 제외다', () => {
    expect(run({ spend: 99_999 }, { clicks: 1 }).skipped).toBe(true)
  })
})
