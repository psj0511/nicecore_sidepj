import { describe, expect, it } from 'vitest'
import { evaluateR6 } from './r6'
import { context, twoDays } from './test-utils'

// 기준일: 클릭 500, 전환 10
const run = (base: object, target: object) =>
  evaluateR6(context('R6', twoDays(base, target)))

describe('R6 클릭 급증', () => {
  it('클릭 +200% 그리고 전환 +20% 정확히면 위반이다 (경계)', () => {
    expect(run({}, { clicks: 1_500, conversions: 12 })).toMatchObject({
      triggered: true,
      severity: 'high',
      baselineValue: 500,
      actualValue: 1_500,
    })
  })

  it('클릭 증가가 +200% 미만이면 위반이 아니다', () => {
    expect(run({}, { clicks: 1_499, conversions: 10 }).triggered).toBe(false)
  })

  it('전환이 +20% 를 넘게 늘면 위반이 아니다', () => {
    expect(run({}, { clicks: 3_000, conversions: 13 }).triggered).toBe(false)
  })

  it('전환이 줄어도 위반이다', () => {
    expect(run({}, { clicks: 3_000, conversions: 0 }).triggered).toBe(true)
  })

  it('기준일 전환이 0이면 전환이 0일 때만 위반이다', () => {
    expect(
      run({ conversions: 0 }, { clicks: 1_500, conversions: 0 }).triggered
    ).toBe(true)
    expect(
      run({ conversions: 0 }, { clicks: 1_500, conversions: 1 }).triggered
    ).toBe(false)
  })

  it('기준일 클릭이 0이면 평가 제외다', () => {
    expect(run({ clicks: 0 }, { clicks: 100 }).skipped).toBe(true)
  })

  it('기준일 비용 100,000원 미만은 평가 제외다', () => {
    expect(run({ spend: 99_999 }, { clicks: 5_000 }).skipped).toBe(true)
  })
})
