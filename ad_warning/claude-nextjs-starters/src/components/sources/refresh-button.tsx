'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { refreshSourcesAction } from '@/lib/actions/sources'

export function RefreshButton() {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await refreshSourcesAction()
            toast.success('Notion에서 최신 데이터를 다시 읽었습니다')
          } catch {
            toast.error('새로고침에 실패했습니다. 잠시 후 다시 시도해주세요')
          }
        })
      }
    >
      {pending ? '읽는 중…' : '지금 새로고침'}
    </Button>
  )
}
