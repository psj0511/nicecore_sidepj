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
import { formatKRW, formatNumber, formatRoas } from '@/lib/format'
import {
  getIssueTitle,
  getMockDailyMetrics,
  getMockIssues,
  getMockSummary,
  mockSyncs,
} from '@/lib/mock'
import {
  ISSUE_STATUS_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type IssueStatus,
} from '@/types'

const OPEN_STATUSES: IssueStatus[] = ['new', 'in_progress']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: raw } = await searchParams
  const period = raw === '30' ? '30' : '7'
  const days = period === '30' ? 30 : 7

  // TODO(Task 010): 더미 데이터를 실제 조회로 교체
  const hasData = mockSyncs.some(s => s.status === 'success')

  if (!hasData) {
    return (
      <PageShell title="대시보드" description="핵심 지표와 미해결 이슈">
        <EmptyState
          title="아직 동기화된 데이터가 없습니다"
          description="Notion 성과 데이터를 동기화하면 지표와 이슈가 표시됩니다."
          action={
            <Button asChild>
              <Link href="/sync">데이터 동기화하러 가기</Link>
            </Button>
          }
        />
      </PageShell>
    )
  }

  const summary = getMockSummary(days)
  const trend = getMockDailyMetrics(days)
  const openIssues = getMockIssues().filter(i =>
    OPEN_STATUSES.includes(i.status)
  )
  const recent = getMockIssues().slice(0, 5)

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
