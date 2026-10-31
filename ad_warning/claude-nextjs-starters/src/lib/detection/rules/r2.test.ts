import { describe, expect, it } from 'vitest'
import { evaluateR2 } from './r2'
import { context, twoDays } from './test-utils'

const run = (base: object, target: object) =>
  evaluateR2(context('R2', twoDays(base, target)))

describe('R2 노출 급감', () => {
  it('-60% 정확히는 위반이다 (경계)', () => {
    expect(run({ impressions: 10_000 }, { impressions: 4_000 })).toMatchObject({
      triggered: true,
      severity: 'high',
      baselineValue: 10_000,
      actualValue: 4_000,
    })
  })

  it('-60% 보다 덜 줄면 위반이 아니다', () => {
    expect(run({ impressions: 10_000 }, { impressions: 4_001 }).triggered).toBe(
      false
    )
  })

  it('노출이 0이 되어도 위반이다 (대상일 비용이 0이어도)', () => {
    const r = run({ impressions: 10_000 }, { impressions: 0, spend: 0 })
    expect(r.triggered).toBe(true)
  })

  it('기준일 비용 100,000원 미만은 평가 제외다', () => {
    expect(run({ spend: 99_999 }, { impressions: 0 })).toMatchObject({
      skipped: true,
    })
  })

  it('기준일 노출이 0이면 평가 제외다', () => {
    expect(run({ impressions: 0 }, { impressions: 0 })).toMatchObject({
      skipped: true,
    })
  })
})
