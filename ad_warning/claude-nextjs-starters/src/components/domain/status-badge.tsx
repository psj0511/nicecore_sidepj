import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ISSUE_STATUS_LABELS, type IssueStatus } from '@/types'

const STYLES: Record<IssueStatus, string> = {
  new: 'border-transparent bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100',
  in_progress:
    'border-transparent bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100',
  resolved:
    'border-transparent bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100',
  ignored: 'border-transparent bg-muted text-muted-foreground',
}

export function StatusBadge({
  status,
  className,
}: {
  status: IssueStatus
  className?: string
}) {
  return (
    <Badge className={cn(STYLES[status], className)}>
      {ISSUE_STATUS_LABELS[status]}
    </Badge>
  )
}
