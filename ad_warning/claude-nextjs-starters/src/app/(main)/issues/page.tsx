import Link from 'next/link'
import { IssueFilters } from '@/components/issues/issue-filters'
import { EmptyState } from '@/components/domain/empty-state'
import { SeverityBadge } from '@/components/domain/severity-badge'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageShell } from '@/components/layout/page-shell'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { runDetection } from '@/lib/detection/service'
import { formatDate } from '@/lib/format'
import { listIssues } from '@/lib/repositories/issues'
import { listRules } from '@/lib/repositories/rules'
import { Pagination } from '@/components/domain/pagination'
import { paginate, parsePage } from '@/lib/pagination'
import {
  ISSUE_STATUSES,
  SEVERITIES,
  type IssueStatus,
  type Severity,
} from '@/types'

export const dynamic = 'force-dynamic'

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    severity?: string
    period?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const status = ISSUE_STATUSES.find(s => s === sp.status) as
    | IssueStatus
    | undefined
  const severity = SEVERITIES.find(s => s === sp.severity) as
    | Severity
    | undefined
  const days = sp.period === '7' ? 7 : sp.period === '30' ? 30 : undefined

  // 조회 시점에 최신 성과 데이터로 감지를 실행한다. 실패해도 목록은 보여 준다
  const detection = await runDetection().then(
    summary => ({ summary, error: null }),
    (e: unknown) => ({
      summary: null,
      error: e instanceof Error ? e.message : '감지 실행 실패',
    })
  )

  const [issues, rules] = await Promise.all([
    listIssues({ status, severity, days }),
    listRules(),
  ])
  const ruleById = new Map(rules.map(r => [r.id, r]))
  const paged = paginate(issues, parsePage(sp.page))

  return (
    <PageShell title="이슈" description="감지된 이슈 목록">
      {detection.summary ? (
        <Alert role="status">
          <AlertTitle>
            이번 조회에서 새 이슈 {detection.summary.created}건 생성
          </AlertTitle>
          <AlertDescription>
            규칙 평가 {detection.summary.evaluated}건 · 평가 제외{' '}
            {detection.summary.skipped}건 (최소 규모 미달·비교 데이터 부족)
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive" role="alert">
          <AlertTitle>이상 감지를 실행하지 못했습니다</AlertTitle>
          <AlertDescription>{detection.error}</AlertDescription>
        </Alert>
      )}
      <IssueFilters />
      {issues.length === 0 ? (
        <EmptyState
          title="조건에 맞는 이슈가 없습니다"
          description="필터를 변경해 보세요."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableCaption className="sr-only">
              감지 이슈 목록 (최신순)
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>규칙</TableHead>
                <TableHead>심각도</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>감지일</TableHead>
                <TableHead>Notion 티켓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.items.map(issue => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="hover:underline"
                    >
                      {`${ruleById.get(issue.rule_id)?.type ?? '이상 감지'} · ${issue.target}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {ruleById.get(issue.rule_id)?.rule_code}
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={issue.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell>{formatDate(issue.detected_at)}</TableCell>
                  <TableCell>
                    {issue.notion_url ? (
                      <Badge variant="secondary">생성됨</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        없음
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        basePath="/issues"
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        params={{
          status: sp.status,
          severity: sp.severity,
          period: sp.period,
        }}
      />
    </PageShell>
  )
}
