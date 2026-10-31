'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  saveIssueMemoAction,
  updateIssueStatusAction,
} from '@/lib/actions/issues'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  type Issue,
  type IssueStatus,
} from '@/types'

interface IssueActionsProps {
  issue: Issue
  notionConnected: boolean
}

/** 상태·메모는 Server Action으로 저장. Notion 티켓 생성은 Task 011 */
export function IssueActions({ issue, notionConnected }: IssueActionsProps) {
  const [status, setStatus] = useState<IssueStatus>(issue.status)
  const [memo, setMemo] = useState(issue.memo ?? '')
  const hasTicket = Boolean(issue.notion_url)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="issue-status">상태</Label>
        <Select
          value={status}
          onValueChange={async v => {
            const res = await updateIssueStatusAction(issue.id, v)
            if (!res.ok) {
              toast.error(res.error)
              return
            }
            setStatus(v as IssueStatus)
            toast.success(
              `상태를 '${ISSUE_STATUS_LABELS[v as IssueStatus]}'(으)로 변경했습니다`
            )
          }}
        >
          <SelectTrigger id="issue-status" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ISSUE_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {ISSUE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issue-memo">메모</Label>
        <Textarea
          id="issue-memo"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="대응 내용을 기록하세요"
          rows={4}
        />
        <Button
          variant="outline"
          onClick={async () => {
            const res = await saveIssueMemoAction(issue.id, memo)
            if (res.ok) toast.success('메모를 저장했습니다')
            else toast.error(res.error)
          }}
        >
          메모 저장
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Notion 티켓</Label>
        {hasTicket ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>티켓 생성됨</Button>
            <a
              href={issue.notion_url!}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline"
            >
              티켓 열기
            </a>
          </div>
        ) : notionConnected ? (
          <Button
            onClick={() =>
              toast.info('Notion 티켓 생성은 Task 011에서 연동됩니다')
            }
          >
            Notion 티켓 생성
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Notion 연동이 필요합니다.
            </p>
            <Button asChild>
              <Link href={`/settings/notion?returnTo=/issues/${issue.id}`}>
                Notion 연동 설정으로 이동
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
