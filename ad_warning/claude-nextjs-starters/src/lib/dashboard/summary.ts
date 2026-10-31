import type { AdMetric } from '@/types'
import type { DailyMetric } from '@/components/domain/metric-trend-chart'

export interface PeriodSummary {
  spend: number
  clicks: number
  conversions: number
  revenue: number
  roas: number
  change: {
    spend?: number
    clicks?: number
    conversions?: number
    roas?: number
  } | null
}

function addDays(date: string, delta: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** 데이터의 가장 최근 날짜 (오늘이 아니라 데이터 기준으로 기간을 잡는다) */
export function latestDate(metrics: AdMetric[]): string | null {
  return metrics.reduce<string | null>(
    (max, m) => (max === null || m.date > max ? m.date : max),
    null
  )
}

/** end 날짜를 포함해 최근 days일 */
function inWindow(metrics: AdMetric[], end: string, days: number, offset = 0) {
  const to = addDays(end, -offset)
  const from = addDays(to, -(days - 1))
  return metrics.filter(m => m.date >= from && m.date <= to)
}

function total(rows: AdMetric[]) {
  return rows.reduce(
    (a, m) => ({
      spend: a.spend + m.spend,
      clicks: a.clicks + m.clicks,
      conversions: a.conversions + m.conversions,
      revenue: a.revenue + m.revenue,
    }),
    { spend: 0, clicks: 0, conversions: 0, revenue: 0 }
  )
}

const roasOf = (t: { spend: number; revenue: number }) =>
  t.spend ? t.revenue / t.spend : 0

/** 선택 기간 합계와 직전 동일 기간 대비 변화율. 직전 기간 데이터가 없으면 change 는 null */
export function summarize(
  metrics: AdMetric[],
  days: number,
  end = latestDate(metrics)
): PeriodSummary {
  if (!end) {
    return {
      spend: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      roas: 0,
      change: null,
    }
  }
  const cur = total(inWindow(metrics, end, days))
  const prevRows = inWindow(metrics, end, days, days)
  const prev = prevRows.length > 0 ? total(prevRows) : null
  const rate = (a: number, b: number) => (b ? a / b - 1 : undefined)
  return {
    ...cur,
    roas: roasOf(cur),
    change: prev && {
      spend: rate(cur.spend, prev.spend),
      clicks: rate(cur.clicks, prev.clicks),
      conversions: rate(cur.conversions, prev.conversions),
      roas: rate(roasOf(cur), roasOf(prev)),
    },
  }
}

/** 일자별 합계 (모든 채널·캠페인 합산), 날짜 오름차순 */
export function dailySeries(
  metrics: AdMetric[],
  days: number,
  end = latestDate(metrics)
): DailyMetric[] {
  if (!end) return []
  const byDate = new Map<string, DailyMetric>()
  for (const m of inWindow(metrics, end, days)) {
    const row = byDate.get(m.date) ?? {
      date: m.date,
      spend: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    row.spend += m.spend
    row.clicks += m.clicks
    row.conversions += m.conversions
    row.revenue += m.revenue
    byDate.set(m.date, row)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
