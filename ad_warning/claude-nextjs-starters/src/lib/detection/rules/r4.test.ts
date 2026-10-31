import { describe, expect, it } from 'vitest'
import { evaluateR4 } from './r4'
import { context, twoDays, weekHistory } from './test-utils'

const run = (base: object, target: object, o = {}) =>
  evaluateR4(context('R4', twoDays(base, target), o))

describe('R4 전환 0', () => {
  it('비용 ≥ 100,000, 전환 0, 기준일 전환 ≥ 1 이면 긴급이다 (경계)', () => {
    expect(
      run({ conversions: 1 }, { spend: 100_000, conversions: 0 })
    ).toMatchObject({
      triggered: true,
      severity: 'critical',
      baselineValue: 1,
      actualValue: 0,
    })
  })

  it('당일 비용 100,000원 미만은 평가 제외다', () => {
    expect(
      run({ conversions: 5 }, { spend: 99_999, conversions: 0 }).skipped
    ).toBe(true)
  })

  it('전환이 1건이라도 있으면 위반이 아니다', () => {
    expect(run({}, { conversions: 1 }).triggered).toBe(false)
  })

  it('기준일 전환이 0이면 위반이 아니다', () => {
    expect(run({ conversions: 0 }, { conversions: 0 })).toMatchObject({
      triggered: false,
      skipped: false,
    })
  })

  it('주말·공휴일이면 한 단계 낮추고 안내를 붙인다', () => {
    const r = run({ conversions: 5 }, { conversions: 0 }, { weekend: true })
    expect(r).toMatchObject({
      triggered: true,
      severity: 'high',
      weekendNote: '주말·공휴일 가능성',
    })
  })

  it('직전 7일 평균 전환이 1 미만이면 위반이 아니다', () => {
    const days = [1, 0, 0, 0, 0, 0, 0].map(conversions => ({ conversions }))
    const r = evaluateR4(context('R4', weekHistory(days, { conversions: 0 })))
    expect(r.triggered).toBe(false)
  })

  it('직전 7일 평균 전환이 1 이상이면 위반이다', () => {
    const days = [7, 0, 0, 0, 0, 0, 0].map(conversions => ({ conversions }))
    const r = evaluateR4(context('R4', weekHistory(days, { conversions: 0 })))
    expect(r).toMatchObject({ triggered: true, baselineValue: 1 })
  })
})
