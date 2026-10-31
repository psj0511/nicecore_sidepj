import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SEVERITY_LABELS, type Severity } from '@/types'

const STYLES: Record<Severity, string> = {
  critical: 'border-transparent bg-red-600 text-white dark:bg-red-700',
  high: 'border-transparent bg-orange-500 text-white dark:bg-orange-600',
  medium:
    'border-transparent bg-yellow-100 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-100',
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity
  className?: string
}) {
  return (
    <Badge className={cn(STYLES[severity], className)}>
      {SEVERITY_LABELS[severity]}
    </Badge>
  )
}
