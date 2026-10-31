import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  /** 페이지 번호를 제외한 현재 쿼리(필터 유지용) */
  params: Record<string, string | undefined>
  basePath: string
}

export function Pagination({
  page,
  totalPages,
  total,
  params,
  basePath,
}: PaginationProps) {
  if (totalPages <= 1) return null
  const href = (p: number) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s ? `${basePath}?${s}` : basePath
  }
  return (
    <nav
      aria-label="페이지 이동"
      className="flex items-center justify-between gap-2"
    >
      <p className="text-muted-foreground text-sm" aria-live="polite">
        총 {total}건 · {page}/{totalPages} 페이지
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page - 1)} rel="prev">
              이전
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            이전
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page + 1)} rel="next">
              다음
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            다음
          </Button>
        )}
      </div>
    </nav>
  )
}
