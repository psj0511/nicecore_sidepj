import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  /** 전 기간 대비 변화율 (0.1 = +10%) */
  change?: number
  className?: string
}

export function MetricCard({
  label,
  value,
  change,
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p
            className={cn(
              'mt-1 text-xs',
              change >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(1)}%
            <span className="text-muted-foreground"> 전 기간 대비</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
