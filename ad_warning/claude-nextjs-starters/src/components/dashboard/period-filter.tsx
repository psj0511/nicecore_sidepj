'use client'

import { usePathname, useRouter } from 'next/navigation'
import { PeriodSelect, type Period } from '@/components/domain/period-select'

export function PeriodFilter({ value }: { value: Period }) {
  const router = useRouter()
  const pathname = usePathname()
  return (
    <PeriodSelect
      value={value}
      onValueChange={p => router.push(`${pathname}?period=${p}`)}
    />
  )
}
