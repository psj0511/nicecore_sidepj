import Link from 'next/link'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { EmptyState } from '@/components/domain/empty-state'
import { MetricCard } from '@/components/domain/metric-card'
import { MetricTrendChart } from '@/components/domain/metric-trend-chart'
import { SeverityBadge } from '@/components/domain/severity-badge'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { dailySeries, summarize } from '@/lib/dashboard/summary'
import { runDetection } from '@/lib/detection/service'
import { formatKRW, formatNumber, formatRoas } from '@/lib/format'
import { listMetrics } from '@/lib/notion/sources'
import { listIssues } from '@/lib/repositories/issues'
import { listRules } from '@/lib/repositories/rules'
import {
  ISSUE_STATUS_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type IssueStatus,
} from '@/types'

export const dynamic = 'force-dynamic'

const OPEN_STATUSES: IssueStatus[] = ['new', 'in_progress']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: raw } = await searchParams
  const period = raw === '30' ? '30' : '7'
  const days = period === '30' ? 30 : 7

  // 성과 데이터는 조회 시점에 Notion 에서 직접 읽는다 (2분 캐시). 이전 기간 비교를 위해 2배 기간이 필요하다
  const metrics = await listMetrics({ from: '0000-01-01', to: '9999-12-31' })
    .then(rows => ({ rows, error: null as string | null }))
    .catch((e: unknown) => ({
      rows: [],
      error: e instanceof Error ? e.message : 'Notion 조회 실패',
    }))
  const hasData = metrics.rows.length > 0

  if (!hasData) {
    return (
      <PageShell title="대시보드" description="핵심 지표와 미해결 이슈">
        <EmptyState
          title="아직 읽어 온 데이터가 없습니다"
          description={
            metrics.error
              ? `Notion 데이터를 읽지 못했습니다: ${metrics.error}`
              : 'Notion 성과 데이터베이스가 연결되면 지표와 이슈가 실시간으로 표시됩니다.'
          }
          action={
            <Button asChild>
              <Link href="/sources">데이터 연결 상태 확인하기</Link>
            </Button>
          }
        />
      </PageShell>
    )
  }

  const summary = summarize(metrics.rows, days)
  const trend = dailySeries(metrics.rows, days)

  // 최신 데이터로 감지를 실행한 뒤 이슈를 읽는다. 실패해도 대시보드는 표시한다
  await runDetection().catch(() => undefined)
  const [issues, rules] = await Promise.all([
    listIssues().catch(() => []),
    listRules().catch(() => []),
  ])
  const ruleById = new Map(rules.map(r => [r.id, r]))
  const getIssueTitle = (i: (typeof issues)[number]) =>
    `${ruleById.get(i.rule_id)?.type ?? '이상 감지'} · ${i.target}`
  const openIssues = issues.filter(i => OPEN_STATUSES.includes(i.status))
  const recent = issues.slice(0, 5)

  return (
    <PageShell title="대시보드" description="핵심 지표와 미해결 이슈">
      <div className="flex justify-end">
        <PeriodFilter value={period} />
      </div>

      <section
        aria-label="핵심 지표"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="광고비"
          value={formatKRW(summary.spend)}
          change={summary.change?.spend}
        />
        <MetricCard
          label="클릭"
          value={formatNumber(summary.clicks)}
          change={summary.change?.clicks}
        />
        <MetricCard
          label="전환"
          value={formatNumber(summary.conversions)}
          change={summary.change?.conversions}
        />
        <MetricCard
          label="ROAS"
          value={formatRoas(summary.roas)}
          change={summary.change?.roas}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>일자별 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>미해결 이슈</CardTitle>
            <CardDescription>
              신규 · 진행중 상태 {openIssues.length}건
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {OPEN_STATUSES.map(s => (
                <div
                  key={s}
                  className="flex justify-between rounded-md border px-3 py-2"
                >
                  <dt>{ISSUE_STATUS_LABELS[s]}</dt>
                  <dd className="font-semibold">
                    {openIssues.filter(i => i.status === s).length}
                  </dd>
                </div>
              ))}
              {SEVERITIES.map(s => (
                <div
                  key={s}
                  className="flex justify-between rounded-md border px-3 py-2"
                >
                  <dt>{SEVERITY_LABELS[s]}</dt>
                  <dd className="font-semibold">
                    {openIssues.filter(i => i.severity === s).length}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>최근 이슈</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/issues">전체 보기</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                감지된 이슈가 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map(issue => (
                  <li key={issue.id}>
                    <Link
                      href={`/issues/${issue.id}`}
                      className="hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-2"
                    >
                      <span className="truncate text-sm">
                        {getIssueTitle(issue)}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <SeverityBadge severity={issue.severity} />
                        <StatusBadge status={issue.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
