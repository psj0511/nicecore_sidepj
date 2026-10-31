import { describe, expect, it } from 'vitest'
import { evaluateR1 } from './r1'
import { context, twoDays, weekHistory } from './test-utils'

const run = (base: number, target: number, o = {}) =>
  evaluateR1(context('R1', twoDays({ spend: base }, { spend: target }), o))

describe('R1 비용 급증', () => {
  it('+50% 정확히는 위반이다 (경계)', () => {
    const r = run(200_000, 300_000)
    expect(r).toMatchObject({
      triggered: true,
      severity: 'high',
      baselineValue: 200_000,
      actualValue: 300_000,
      detectionKey: 'R1|c1|2026-11-04',
    })
  })

  it('+50% 미만은 위반이 아니다', () => {
    expect(run(200_000, 299_999)).toMatchObject({
      triggered: false,
      skipped: false,
    })
  })

  it('기준일 비용 100,000원 미만은 평가 제외다', () => {
    expect(run(99_999, 300_000)).toMatchObject({ skipped: true })
  })

  it('기준일 비용 100,000원은 평가한다 (경계)', () => {
    expect(run(100_000, 150_000)).toMatchObject({ triggered: true })
  })

  it('데이터가 7일 이상이면 직전 7일 평균과 비교한다', () => {
    const spends = [100, 100, 100, 100, 100, 100, 800].map(k => ({
      spend: k * 1000,
    }))
    // 평균 200,000 → 300,000 은 +50%, (전일 800,000 이면 위반이 아님)
    const r = evaluateR1(context('R1', weekHistory(spends, { spend: 300_000 })))
    expect(r).toMatchObject({ triggered: true, baselineValue: 200_000 })
  })

  it('저장된 임계값을 우선 적용한다', () => {
    const r = run(200_000, 250_000, {
      rule: { threshold: { costChangeRate: 0.2 } },
    })
    expect(r.triggered).toBe(true)
  })

  it('규칙의 심각도 설정을 따르고 주말에도 낮추지 않는다', () => {
    const r = run(200_000, 400_000, {
      weekend: true,
      rule: { severity: 'critical' },
    })
    expect(r).toMatchObject({ severity: 'critical' })
    expect(r.weekendNote).toBeUndefined()
  })
})
