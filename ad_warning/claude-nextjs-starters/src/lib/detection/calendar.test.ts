import { describe, expect, it } from 'vitest'
import { addDays, isHoliday, isWeekend, isWeekendOrHoliday } from './calendar'

describe('calendar', () => {
  it('addDays 는 월·연 경계를 넘는다', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('토·일요일은 주말이다', () => {
    expect(isWeekend('2026-10-31')).toBe(true) // 토
    expect(isWeekend('2026-11-01')).toBe(true) // 일
    expect(isWeekend('2026-11-02')).toBe(false) // 월
  })

  it('고정 공휴일을 인식한다', () => {
    expect(isHoliday('2026-12-25')).toBe(true)
    expect(isHoliday('2027-01-01')).toBe(true)
    expect(isHoliday('2026-11-04')).toBe(false)
  })

  it('평일 공휴일도 완화 대상이다', () => {
    // 2027-01-01 은 금요일
    expect(isWeekend('2027-01-01')).toBe(false)
    expect(isWeekendOrHoliday('2027-01-01')).toBe(true)
  })
})
