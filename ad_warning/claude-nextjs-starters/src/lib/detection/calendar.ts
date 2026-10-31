import { EXTRA_HOLIDAYS, FIXED_HOLIDAYS } from './rules.config'

function parse(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** YYYY-MM-DD 에 n일을 더한 날짜 (시간대 영향 없음) */
export function addDays(date: string, n: number): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 토·일요일 여부 */
export function isWeekend(date: string): boolean {
  const day = parse(date).getUTCDay()
  return day === 0 || day === 6
}

/** 고정 공휴일(MM-DD) 또는 EXTRA_HOLIDAYS 에 등록된 날짜 */
export function isHoliday(date: string): boolean {
  return FIXED_HOLIDAYS.includes(date.slice(5)) || EXTRA_HOLIDAYS.includes(date)
}

export function isWeekendOrHoliday(date: string): boolean {
  return isWeekend(date) || isHoliday(date)
}
