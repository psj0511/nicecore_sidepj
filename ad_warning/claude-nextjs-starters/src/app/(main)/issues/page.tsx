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
import { formatDate } from '@/lib/format'
import { listIssues } from '@/lib/repositories/issues'
import { listRules } from '@/lib/repositories/rules'
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
  searchParams: Promise<{ status?: string; severity?: string; period?: string }>
}) {
  const sp = await searchParams
  const status = ISSUE_STATUSES.find(s => s === sp.status) as
    | IssueStatus
    | undefined
  const severity = SEVERITIES.find(s => s === sp.severity) as
    | Severity
    | undefined
  const days = sp.period === '7' ? 7 : sp.period === '30' ? 30 : undefined

  const [issues, rules] = await Promise.all([
    listIssues({ status, severity, days }),
    listRules(),
  ])
  const ruleById = new Map(rules.map(r => [r.id, r]))

  return (
    <PageShell title="이슈" description="감지된 이슈 목록">
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
              {issues.map(issue => (
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
    </PageShell>
  )
}
