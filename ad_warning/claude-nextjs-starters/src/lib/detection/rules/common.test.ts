import { describe, expect, it } from 'vitest'
import { compare, totalsByDate } from './common'
import { context, row, twoDays, weekHistory } from './test-utils'

describe('totalsByDate', () => {
  it('같은 날짜의 행을 합산하고 날짜 오름차순으로 정렬한다', () => {
    const t = totalsByDate([
      row('2026-11-04', { spend: 100, clicks: 1 }),
      row('2026-11-03', { spend: 50, clicks: 5 }),
      row('2026-11-04', { spend: 200, clicks: 2 }),
    ])
    expect(t.map(d => d.date)).toEqual(['2026-11-03', '2026-11-04'])
    expect(t[1]).toMatchObject({ spend: 300, clicks: 3 })
  })
})

describe('compare (비교 기준)', () => {
  it('데이터가 7일 미만이면 전일과 비교한다', () => {
    const c = compare(context('R1', twoDays({ spend: 111 }, { spend: 222 })))
    expect(c).toMatchObject({ ok: true, mode: 'previous-day' })
    if (c.ok) expect(c.baseline.spend).toBe(111)
  })

  it('이전 데이터가 6일이면 아직 전일 기준이다', () => {
    const six = Array.from({ length: 6 }, () => ({ spend: 100 }))
    const c = compare(context('R1', weekHistory(six, { spend: 500 })))
    expect(c).toMatchObject({ ok: true, mode: 'previous-day' })
  })

  it('이전 데이터가 7일이면 직전 7일 일평균이다', () => {
    const seven = [100, 100, 100, 100, 100, 100, 800].map(spend => ({ spend }))
    const c = compare(context('R1', weekHistory(seven, { spend: 500 })))
    expect(c).toMatchObject({ ok: true, mode: 'average' })
    if (c.ok) expect(c.baseline.spend).toBe(200)
  })

  it('7일 이전 데이터는 평균에 포함하지 않는다', () => {
    const eight = [9_000_000, 100, 100, 100, 100, 100, 100, 100].map(spend => ({
      spend,
    }))
    const c = compare(context('R1', weekHistory(eight, { spend: 500 })))
    if (c.ok) expect(c.baseline.spend).toBe(100)
  })

  it('전일 데이터가 없으면 평가할 수 없다', () => {
    const c = compare(context('R1', [row('2026-11-02'), row('2026-11-04')]))
    expect(c).toEqual({ ok: false, reason: '전일 데이터 없음' })
  })

  it('대상일 데이터가 없으면 평가할 수 없다', () => {
    const c = compare(context('R1', [row('2026-11-03')]))
    expect(c).toEqual({ ok: false, reason: '대상일 데이터 없음' })
  })
})
