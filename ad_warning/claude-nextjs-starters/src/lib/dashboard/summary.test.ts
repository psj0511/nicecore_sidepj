import { describe, expect, it } from 'vitest'
import type { AdMetric } from '@/types'
import { dailySeries, latestDate, summarize } from './summary'

function metric(date: string, over: Partial<AdMetric> = {}): AdMetric {
  return {
    id: `${date}-${over.campaign ?? 'c'}`,
    source_id: 's',
    date,
    channel: 'google',
    campaign: 'c',
    ad_group: null,
    spend: 100,
    impressions: 1000,
    clicks: 10,
    conversions: 1,
    revenue: 300,
    ...over,
  }
}

/** 2026-10-01 ~ 2026-10-14 (14일) */
const fourteen = Array.from({ length: 14 }, (_, i) =>
  metric(`2026-10-${String(i + 1).padStart(2, '0')}`, {
    spend: i < 7 ? 100 : 200,
  })
)

describe('dashboard summary', () => {
  it('데이터가 없으면 0과 null 변화율을 반환한다', () => {
    expect(latestDate([])).toBeNull()
    const s = summarize([], 7)
    expect(s.spend).toBe(0)
    expect(s.change).toBeNull()
    expect(dailySeries([], 7)).toEqual([])
  })

  it('가장 최근 데이터일 기준으로 기간 합계와 직전 기간 대비 변화율을 구한다', () => {
    const s = summarize(fourteen, 7)
    expect(s.spend).toBe(1400)
    expect(s.clicks).toBe(70)
    expect(s.roas).toBeCloseTo(1.5)
    expect(s.change?.spend).toBeCloseTo(1) // 700 -> 1400
    expect(s.change?.clicks).toBeCloseTo(0)
  })

  it('직전 기간 데이터가 없으면 변화율을 표시하지 않는다', () => {
    expect(summarize(fourteen.slice(7), 7).change).toBeNull()
  })

  it('직전 기간 값이 0이면 해당 지표 변화율은 undefined', () => {
    const rows = [
      ...fourteen.slice(0, 7).map(m => ({ ...m, conversions: 0 })),
      ...fourteen.slice(7),
    ]
    expect(summarize(rows, 7).change?.conversions).toBeUndefined()
  })

  it('일자별 추이는 채널·캠페인을 합산하고 날짜순으로 정렬한다', () => {
    const rows = [
      metric('2026-10-02', { campaign: 'a', spend: 50 }),
      metric('2026-10-02', { campaign: 'b', spend: 70 }),
      metric('2026-10-01'),
    ]
    const series = dailySeries(rows, 7)
    expect(series.map(d => d.date)).toEqual(['2026-10-01', '2026-10-02'])
    expect(series[1].spend).toBe(120)
  })

  it('기간 밖 데이터는 제외한다', () => {
    expect(dailySeries(fourteen, 7)).toHaveLength(7)
    expect(dailySeries(fourteen, 7)[0].date).toBe('2026-10-08')
  })
})
