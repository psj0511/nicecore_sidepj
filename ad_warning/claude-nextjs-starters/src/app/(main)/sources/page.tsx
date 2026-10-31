import Link from 'next/link'
import { EmptyState } from '@/components/domain/empty-state'
import { PageShell } from '@/components/layout/page-shell'
import { RefreshButton } from '@/components/sources/refresh-button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { env } from '@/lib/env'
import { METRIC_PROPERTY_NAMES } from '@/lib/notion/properties'
import { SOURCE_CACHE_SECONDS, readAllSources } from '@/lib/notion/sources'

export const dynamic = 'force-dynamic'

export default async function SourcesPage() {
  const connected = Boolean(env.NOTION_TOKEN && env.NOTION_PARENT_PAGE_ID)

  if (!connected) {
    return (
      <PageShell
        title="데이터 연결 상태"
        description="Notion 성과 데이터베이스 실시간 연동 상태"
      >
        <EmptyState
          title="Notion 연동이 필요합니다"
          description="NOTION_TOKEN과 NOTION_PARENT_PAGE_ID를 .env.local에 설정해 주세요."
          action={
            <Button asChild>
              <Link href="/settings/notion?returnTo=/sources">
                Notion 연동 설정으로 이동
              </Link>
            </Button>
          }
        />
      </PageShell>
    )
  }

  const sources = await readAllSources()
  const errors = sources.flatMap(s =>
    s.errors.map(e => ({ database: s.database.title, ...e }))
  )

  return (
    <PageShell
      title="데이터 연결 상태"
      description={`Notion 성과 데이터베이스를 조회할 때마다 직접 읽습니다 (최대 ${SOURCE_CACHE_SECONDS / 60}분 캐시)`}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <RefreshButton />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>성과 데이터베이스</CardTitle>
            <CardDescription>
              부모 페이지 하위 데이터베이스 {sources.length}개 (티켓·앱 데이터
              데이터베이스 제외)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sources.length === 0 ? (
              <EmptyState
                title="하위 데이터베이스가 없습니다"
                description="부모 페이지에 광고 성과 CSV를 가져온 뒤 새로고침하세요."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>데이터베이스</TableHead>
                      <TableHead className="text-right">전체 행</TableHead>
                      <TableHead className="text-right">사용 가능</TableHead>
                      <TableHead>마지막 조회</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map(s => (
                      <TableRow key={s.database.id}>
                        <TableCell className="font-medium">
                          {s.database.title}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.rowCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.metrics.length}
                        </TableCell>
                        <TableCell>
                          {s.fetchedAt.slice(0, 16).replace('T', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              s.errors.length === 0
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {s.errors.length === 0
                              ? '정상'
                              : `오류 ${s.errors.length}건`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              필수 속성: {Object.values(METRIC_PROPERTY_NAMES).join(', ')}{' '}
              (광고그룹은 선택). 구글 Ads·네이버 검색광고 보고서의 원본 컬럼명
              (보고일·일별, 매체, 비용, 클릭수, 노출수, 전환수, 전환 가치 등)도
              그대로 인식합니다.
            </p>
          </CardContent>
        </Card>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>검증 오류 {errors.length}건</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Notion에서 수정하면 다음 조회부터 바로 반영됩니다. 오류가 있는
                행은 감지에서 제외됩니다.
              </p>
              <ul className="list-inside list-disc text-sm">
                {errors.slice(0, 50).map(e => (
                  <li key={`${e.database}-${e.row}-${e.reason}`}>
                    {e.database} {e.row > 0 ? `${e.row}행: ` : ''}
                    {e.reason}
                  </li>
                ))}
              </ul>
              {errors.length > 50 && (
                <p className="mt-2 text-sm">외 {errors.length - 50}건</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </PageShell>
  )
}
