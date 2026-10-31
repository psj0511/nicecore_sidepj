'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface DailyMetric {
  date: string
  spend: number
  clicks: number
  conversions: number
  revenue: number
}

export type TrendKey = 'spend' | 'clicks' | 'conversions'

const SERIES: { key: TrendKey; label: string; color: string }[] = [
  { key: 'spend', label: '광고비', color: 'var(--chart-1)' },
  { key: 'clicks', label: '클릭', color: 'var(--chart-2)' },
  { key: 'conversions', label: '전환', color: 'var(--chart-3)' },
]

export function MetricTrendChart({
  data,
  keys = ['spend', 'clicks', 'conversions'],
}: {
  data: DailyMetric[]
  keys?: TrendKey[]
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label="일자별 지표 추이 차트">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(5)}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <YAxis
            yAxisId="left"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
            width={72}
          />
          {keys.includes('spend') && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
              width={72}
            />
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              color: 'var(--popover-foreground)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
            formatter={v => Number(v).toLocaleString('ko-KR')}
          />
          <Legend />
          {SERIES.filter(s => keys.includes(s.key)).map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              yAxisId={s.key === 'spend' ? 'right' : 'left'}
              name={s.key === 'spend' ? `${s.label} (우)` : s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
