'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { testNotionConnectionAction } from '@/lib/actions/notion-settings'
import type { ConnectionCheck } from '@/lib/tickets/service'

interface Item {
  name: string
  label: string
  /** 표시용 값(토큰은 마스킹됨). 미설정이면 null */
  value: string | null
}

interface Props {
  items: Item[]
  returnTo?: string
}

/** 연동 정보는 .env.local 에서만 설정한다. 이 화면은 설정 여부와 실제 연결을 확인한다 */
export function NotionSettingsPanel({ items, returnTo }: Props) {
  const [checks, setChecks] = useState<ConnectionCheck[] | null>(null)
  const [pending, startTransition] = useTransition()
  const configured = items.every(i => i.value)
  const allOk = checks ? checks.every(c => c.ok) : false

  function runTest() {
    startTransition(async () => {
      const res = await testNotionConnectionAction()
      if (res.ok) setChecks(res.data)
      else toast.error(res.error)
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>연동 정보</CardTitle>
          <CardDescription>
            값은 서버의 .env.local에서만 설정하며 앱에 저장하지 않습니다. 토큰은
            마스킹되어 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-3 text-sm">
            {items.map(i => (
              <div key={i.name} className="flex items-center justify-between">
                <dt>
                  {i.label}
                  <span className="text-muted-foreground block text-xs">
                    {i.name}
                  </span>
                </dt>
                <dd>
                  {i.value ? (
                    <span className="font-mono text-xs">{i.value}</span>
                  ) : (
                    <Badge variant="outline">미설정</Badge>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <Button type="button" onClick={runTest} disabled={pending}>
            {pending ? '확인 중…' : '연결 확인'}
          </Button>
          {allOk && returnTo && (
            <Button asChild variant="link" className="px-0">
              <Link href={returnTo}>← 이전 화면으로 돌아가기</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>연동 상태</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            <Badge variant={configured ? 'secondary' : 'outline'}>
              {configured ? '설정됨' : '미연동'}
            </Badge>
            {!configured && (
              <span className="text-muted-foreground">
                .env.local에 미설정 항목을 추가한 뒤 서버를 다시 시작하세요
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>연결 테스트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {!checks ? (
              <p className="text-muted-foreground text-sm">
                &lsquo;연결 확인&rsquo;을 실행하면 결과가 표시됩니다.
              </p>
            ) : (
              <ul className="space-y-2 text-sm" aria-live="polite">
                {checks.map(c => (
                  <li key={c.label}>
                    <span
                      className={
                        c.ok
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {c.ok ? '✓' : '✗'}
                    </span>{' '}
                    {c.label}
                    {!c.ok && c.note && (
                      <p className="text-muted-foreground ml-5">{c.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
