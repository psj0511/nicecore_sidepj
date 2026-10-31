'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Period = '7' | '30'

export function PeriodSelect({
  value,
  onValueChange,
}: {
  value: Period
  onValueChange: (value: Period) => void
}) {
  return (
    <Select value={value} onValueChange={v => onValueChange(v as Period)}>
      <SelectTrigger className="w-[120px]" aria-label="기간 선택">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">최근 7일</SelectItem>
        <SelectItem value="30">최근 30일</SelectItem>
      </SelectContent>
    </Select>
  )
}
