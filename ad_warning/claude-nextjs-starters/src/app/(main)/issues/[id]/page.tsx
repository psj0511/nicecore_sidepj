import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SeverityBadge } from '@/components/domain/severity-badge'
import { StatusBadge } from '@/components/domain/status-badge'
import { IssueActions } from '@/components/issues/issue-actions'
import { PageShell } from '@/components/layout/page-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RULE_DEFAULTS } from '@/lib/detection/rules.config'
import { RULE_DISPLAY } from '@/lib/detection/rule-display'
import { env } from '@/lib/env'
import { formatDate } from '@/lib/format'
import { getIssue } from '@/lib/repositories/issues'
import { listRules } from '@/lib/repositories/rules'

export const dynamic = 'force-dynamic'

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const issue = await getIssue(id)
  if (!issue) notFound()

  const rules = await listRules()
  const rule = rules.find(r => r.id === issue.rule_id)
  const code = rule?.rule_code
  const display = code ? RULE_DISPLAY[code] : undefined
  const fmt = display?.format ?? String
  const causes = code ? RULE_DEFAULTS[code].suspectedCauses : []

  const evidence: [string, string][] = [
    ['규칙', rule ? `${rule.rule_code} ${rule.type}` : '-'],
    ['대상', issue.target],
    ['감지 대상일', formatDate(issue.target_date)],
    ['비교 기준', '전일 또는 직전 7일 평균 (데이터 기간에 따름)'],
    [
      `기준값${display ? ` (${display.metric})` : ''}`,
      fmt(issue.baseline_value),
    ],
    [`실제값${display ? ` (${display.metric})` : ''}`, fmt(issue.actual_value)],
    ['감지일', formatDate(issue.detected_at)],
  ]

  return (
    <PageShell
      title={`${rule?.type ?? '이상 감지'} · ${issue.target}`}
      description={`이슈 #${issue.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/issues">← 이슈 목록</Link>
        </Button>
      </div>

      {issue.weekend_note && (
        <Alert>
          <AlertTitle>{issue.weekend_note}</AlertTitle>
          <AlertDescription>
            대상일이 주말·공휴일이라 심각도가 한 단계 낮춰졌습니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>감지 근거</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {evidence.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 border-b pb-2 last:border-0"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {causes.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-1 text-sm font-semibold">의심 원인</h3>
                <ul className="list-inside list-disc text-sm">
                  {causes.map(c => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>처리</CardTitle>
          </CardHeader>
          <CardContent>
            <IssueActions
              issue={issue}
              notionConnected={Boolean(
                env.NOTION_TOKEN && env.NOTION_DATABASE_ID
              )}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
