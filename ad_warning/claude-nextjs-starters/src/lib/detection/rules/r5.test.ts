import { describe, expect, it } from 'vitest'
import { evaluateR5 } from './r5'
import { context, row } from './test-utils'

const cpaRule = { target_type: 'cpa', target_value: 20_000 } as const
const roasRule = { target_type: 'roas', target_value: 5 } as const

const run = (metric: object, rule: object, weekend = false) =>
  evaluateR5(context('R5', [row('2026-11-04', metric)], { rule, weekend }))

describe('R5 CPA/ROAS 이탈', () => {
  it('목표값이 없으면 평가 제외다', () => {
    expect(run({}, {}).skipped).toBe(true)
    expect(run({}, { target_type: 'cpa', target_value: null }).skipped).toBe(
      true
    )
  })

  describe('리드형 (CPA)', () => {
    it('CPA 가 목표 +30% 정확히면 위반이다 (경계)', () => {
      expect(run({ spend: 260_000, conversions: 10 }, cpaRule)).toMatchObject({
        triggered: true,
        severity: 'medium',
        baselineValue: 20_000,
        actualValue: 26_000,
      })
    })

    it('목표 +30% 미만이면 위반이 아니다', () => {
      expect(run({ spend: 259_990, conversions: 10 }, cpaRule).triggered).toBe(
        false
      )
    })

    it('전환 0 이면 평가 제외다 (R4 영역)', () => {
      expect(run({ spend: 500_000, conversions: 0 }, cpaRule).skipped).toBe(
        true
      )
    })

    it('비용 100,000원 미만은 평가 제외다', () => {
      expect(run({ spend: 99_999, conversions: 1 }, cpaRule).skipped).toBe(true)
    })
  })

  describe('이커머스형 (ROAS)', () => {
    it('ROAS 가 목표 ×0.7 정확히면 위반이다 (경계)', () => {
      expect(run({ spend: 200_000, revenue: 700_000 }, roasRule)).toMatchObject(
        {
          triggered: true,
          baselineValue: 5,
          actualValue: 3.5,
        }
      )
    })

    it('목표 ×0.7 초과면 위반이 아니다', () => {
      expect(
        run({ spend: 200_000, revenue: 700_001 }, roasRule).triggered
      ).toBe(false)
    })

    it('매출이 0이어도 위반이다', () => {
      expect(run({ spend: 200_000, revenue: 0 }, roasRule).triggered).toBe(true)
    })
  })

  it('주말·공휴일에는 안내를 붙인다 (보통은 더 낮출 수 없어 유지)', () => {
    expect(
      run({ spend: 260_000, conversions: 10 }, cpaRule, true)
    ).toMatchObject({
      triggered: true,
      severity: 'medium',
      weekendNote: '주말·공휴일 가능성',
    })
  })

  it('규칙 심각도가 높음이면 주말에 보통으로 낮춘다', () => {
    const r = run(
      { spend: 260_000, conversions: 10 },
      { ...cpaRule, severity: 'high' },
      true
    )
    expect(r.severity).toBe('medium')
  })
})
