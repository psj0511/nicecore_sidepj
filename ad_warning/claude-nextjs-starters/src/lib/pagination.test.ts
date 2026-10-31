import { describe, expect, it } from 'vitest'
import { paginate, parsePage } from './pagination'

const rows = Array.from({ length: 45 }, (_, i) => i + 1)

describe('paginate', () => {
  it('첫 페이지는 앞 20건', () => {
    const p = paginate(rows, 1)
    expect(p.items).toHaveLength(20)
    expect(p.items[0]).toBe(1)
    expect(p.totalPages).toBe(3)
    expect(p.total).toBe(45)
  })
  it('마지막 페이지는 남은 건수', () => {
    const p = paginate(rows, 3)
    expect(p.items).toEqual([41, 42, 43, 44, 45])
  })
  it('범위를 벗어나면 보정', () => {
    expect(paginate(rows, 99).page).toBe(3)
    expect(paginate(rows, 0).page).toBe(1)
    expect(paginate(rows, NaN).page).toBe(1)
  })
  it('빈 목록은 1페이지', () => {
    const p = paginate([], 1)
    expect(p).toMatchObject({ items: [], page: 1, totalPages: 1, total: 0 })
  })
  it('경계: 정확히 pageSize 건이면 1페이지', () => {
    expect(paginate(rows.slice(0, 20), 1).totalPages).toBe(1)
    expect(paginate(rows.slice(0, 21), 1).totalPages).toBe(2)
  })
})

describe('parsePage', () => {
  it('유효하지 않은 값은 1', () => {
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage('-2')).toBe(1)
    expect(parsePage('1.5')).toBe(1)
    expect(parsePage('3')).toBe(3)
  })
})
