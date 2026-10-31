'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { EmptyState } from '@/components/domain/empty-state'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteSyncAction } from '@/lib/actions/syncs'
import { METRIC_PROPERTY_NAMES } from '@/lib/notion/properties'
import type { MockNotionDatabase, MockValidationError } from '@/lib/mock'
import { SYNC_STATUS_LABELS, type DataSync } from '@/types'

interface SyncManagerProps {
  connected: boolean
  databases: MockNotionDatabase[]
  initialSyncs: DataSync[]
  errors: MockValidationError[]
  summary: { createdIssues: number; excludedTargets: number }
}

/** 더미 단계: 동기화·삭제는 로컬 상태만 변경 (Task 007에서 실제 연동) */
export function SyncManager({
  connected,
  databases,
  initialSyncs,
  errors,
  summary,
}: SyncManagerProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [syncs, setSyncs] = useState(initialSyncs)
  const [deleting, setDeleting] = useState<DataSync | null>(null)
  const [showResult, setShowResult] = useState(false)

  if (!connected) {
    return (
      <EmptyState
        title="Notion 연동이 필요합니다"
        description="토큰과 성과 데이터 부모 페이지를 먼저 설정해 주세요."
        action={
          <Button asChild>
            <Link href="/settings/notion?returnTo=/sync">
              Notion 연동 설정으로 이동
            </Link>
          </Button>
        }
      />
    )
  }

  const allSelected =
    databases.length > 0 && selected.length === databases.length
  const toggle = (id: string, on: boolean) =>
    setSelected(prev => (on ? [...prev, id] : prev.filter(x => x !== id)))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>성과 데이터베이스</CardTitle>
          <CardDescription>
            부모 페이지 하위 데이터베이스 {databases.length}개 (티켓
            데이터베이스 제외)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {databases.length === 0 ? (
            <EmptyState
              title="하위 데이터베이스가 없습니다"
              description="부모 페이지에 광고 성과 CSV를 가져온 뒤 다시 확인하세요."
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={on =>
                    setSelected(on ? databases.map(d => d.id) : [])
                  }
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  전체 선택
                </label>
              </div>
              <ul className="divide-y rounded-md border">
                {databases.map(db => (
                  <li key={db.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      id={`db-${db.id}`}
                      checked={selected.includes(db.id)}
                      onCheckedChange={on => toggle(db.id, on === true)}
                    />
                    <label htmlFor={`db-${db.id}`} className="flex-1 text-sm">
                      {db.title}
                    </label>
                    <span className="text-muted-foreground text-xs">
                      {db.rowCount}행
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                disabled={selected.length === 0}
                onClick={() => {
                  setShowResult(true)
                  toast.success(
                    `${selected.length}개 데이터베이스 동기화를 완료했습니다 (더미)`
                  )
                }}
              >
                동기화 ({selected.length})
              </Button>
            </>
          )}
          <p className="text-muted-foreground text-xs">
            필수 속성: {Object.values(METRIC_PROPERTY_NAMES).join(', ')}{' '}
            (광고그룹은 선택)
          </p>
        </CardContent>
      </Card>

      {showResult && (
        <Alert>
          <AlertTitle>감지 결과 요약</AlertTitle>
          <AlertDescription>
            생성된 이슈 {summary.createdIssues}건 · 최소 규모 필터로 평가 제외된
            대상 {summary.excludedTargets}건
            <Link href="/" className="ml-3 underline">
              대시보드에서 확인
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>검증 오류 {errors.length}건</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Notion에서 수정한 뒤 다시 동기화하세요. 오류가 있으면 저장되지
              않습니다.
            </p>
            <ul className="list-inside list-disc text-sm">
              {errors.map(e => (
                <li key={`${e.database}-${e.row}`}>
                  {e.database} {e.row}행: {e.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>동기화 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {syncs.length === 0 ? (
            <EmptyState title="동기화 이력이 없습니다" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>데이터베이스</TableHead>
                    <TableHead>일시</TableHead>
                    <TableHead className="text-right">행 수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncs.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>
                        {s.synced_at.slice(0, 16).replace('T', ' ')}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.row_count}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === 'success' ? 'secondary' : 'destructive'
                          }
                        >
                          {SYNC_STATUS_LABELS[s.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(s)}
                        >
                          삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleting !== null}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>동기화를 삭제할까요?</DialogTitle>
            <DialogDescription>
              &lsquo;{deleting?.title}&rsquo;의 지표 데이터와 이 데이터에서
              감지된 이슈가 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting) return
                const res = await deleteSyncAction(deleting.id)
                if (!res.ok) {
                  toast.error(res.error)
                  return
                }
                setSyncs(prev => prev.filter(s => s.id !== deleting.id))
                setDeleting(null)
                toast.success('동기화를 삭제했습니다')
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
