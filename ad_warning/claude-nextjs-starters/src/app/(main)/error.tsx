'use client'

import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Container className="space-y-4">
      <h1 role="alert" className="text-2xl font-bold">
        문제가 발생했습니다
      </h1>
      <p className="text-muted-foreground text-sm">
        {error.message || '잠시 후 다시 시도해주세요.'}
      </p>
      {error.digest && (
        <p className="text-muted-foreground text-xs">
          오류 코드: {error.digest}
        </p>
      )}
      <Button onClick={reset}>다시 시도</Button>
    </Container>
  )
}
