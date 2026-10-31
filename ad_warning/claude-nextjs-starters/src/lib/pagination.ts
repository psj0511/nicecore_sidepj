export const DEFAULT_PAGE_SIZE = 20

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** 1부터 시작하는 page를 유효 범위로 보정해 해당 구간만 잘라 반환한다 */
export function paginate<T>(
  all: T[],
  page: number,
  pageSize = DEFAULT_PAGE_SIZE
): Page<T> {
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
  const safe = Number.isFinite(page) ? Math.trunc(page) : 1
  const current = Math.min(Math.max(1, safe), totalPages)
  const start = (current - 1) * pageSize
  return {
    items: all.slice(start, start + pageSize),
    page: current,
    pageSize,
    total: all.length,
    totalPages,
  }
}

/** 쿼리 문자열의 page 값을 정수로 해석한다. 잘못된 값은 1 */
export function parsePage(value: string | undefined): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : 1
}
