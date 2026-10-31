'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
} from '@/types'

export function IssueFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === 'all') next.delete(key)
    else next.set(key, value)
    next.delete('page')
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={params.get('status') ?? 'all'}
        onValueChange={v => update('status', v)}
      >
        <SelectTrigger className="w-[130px]" aria-label="상태 필터">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          {ISSUE_STATUSES.map(s => (
            <SelectItem key={s} value={s}>
              {ISSUE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.get('severity') ?? 'all'}
        onValueChange={v => update('severity', v)}
      >
        <SelectTrigger className="w-[130px]" aria-label="심각도 필터">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 심각도</SelectItem>
          {SEVERITIES.map(s => (
            <SelectItem key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.get('period') ?? 'all'}
        onValueChange={v => update('period', v)}
      >
        <SelectTrigger className="w-[130px]" aria-label="기간 필터">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 기간</SelectItem>
          <SelectItem value="7">최근 7일</SelectItem>
          <SelectItem value="30">최근 30일</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
