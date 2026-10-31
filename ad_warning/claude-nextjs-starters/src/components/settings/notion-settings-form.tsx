'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { MockConnectionTest } from '@/lib/mock'
import {
  notionConfigFormSchema,
  type NotionConfigFormValues,
} from '@/lib/validations/notion-config'

interface Props {
  initiallyConnected: boolean
  maskedToken: string
  testResult: MockConnectionTest
  returnTo?: string
}

/** 더미 단계: 저장·연결 테스트는 화면 상태만 변경 (Task 011에서 실제 연동) */
export function NotionSettingsForm({
  initiallyConnected,
  maskedToken,
  testResult,
  returnTo,
}: Props) {
  const [connected, setConnected] = useState(initiallyConnected)
  const [tested, setTested] = useState<MockConnectionTest | null>(null)

  const form = useForm<NotionConfigFormValues>({
    resolver: zodResolver(notionConfigFormSchema),
    defaultValues: { token: '', parentPageId: '', databaseId: '' },
  })

  const checks: [string, boolean, string?][] = tested
    ? [
        ['토큰 유효성', tested.tokenValid],
        ['부모 페이지 접근', tested.parentPageAccessible],
        [
          `하위 데이터베이스 ${tested.databaseCount}개 발견`,
          tested.databaseCount > 0,
        ],
        [
          '티켓 데이터베이스 속성 일치',
          tested.ticketDbMatches,
          tested.ticketDbMessage,
        ],
      ]
    : []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>연동 정보</CardTitle>
          <CardDescription>
            토큰은 서버에서만 사용되며 화면에는 마스킹되어 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(() => {
                setConnected(true)
                toast.success('Notion 연동 정보를 저장했습니다')
              })}
            >
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notion 토큰</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder={connected ? maskedToken : 'secret_...'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentPageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>성과 데이터 부모 페이지 ID</FormLabel>
                    <FormControl>
                      <Input placeholder="페이지 ID 또는 URL" {...field} />
                    </FormControl>
                    <FormDescription>
                      CSV를 가져온 부모 페이지입니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="databaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>티켓 데이터베이스 ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="데이터베이스 ID 또는 URL"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit">저장</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTested(testResult)}
                >
                  연결 테스트
                </Button>
              </div>
              {connected && returnTo && (
                <Button asChild variant="link" className="px-0">
                  <Link href={returnTo}>← 이전 화면으로 돌아가기</Link>
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>연동 상태</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            <Badge variant={connected ? 'secondary' : 'outline'}>
              {connected ? '연동됨' : '미연동'}
            </Badge>
            {connected && (
              <span className="text-muted-foreground">토큰 {maskedToken}</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>연결 테스트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {!tested ? (
              <p className="text-muted-foreground text-sm">
                &lsquo;연결 테스트&rsquo;를 실행하면 결과가 표시됩니다.
              </p>
            ) : (
              <ul className="space-y-2 text-sm" aria-live="polite">
                {checks.map(([label, ok, note]) => (
                  <li key={label}>
                    <span
                      className={
                        ok
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {ok ? '✓' : '✗'}
                    </span>{' '}
                    {label}
                    {!ok && note && (
                      <p className="text-muted-foreground ml-5">{note}</p>
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
