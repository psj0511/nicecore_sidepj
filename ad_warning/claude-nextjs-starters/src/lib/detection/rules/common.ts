import type {
  AdMetric,
  DetectionContext,
  DetectionResult,
  RuleCode,
  Severity,
} from '@/types'
import { addDays } from '../calendar'
import {
  COMMON_RULE_CONFIG,
  RULE_DEFAULTS,
  WEEKEND_NOTE,
  buildDetectionKey,
} from '../rules.config'

const EPS = 1e-9

export interface DayTotals {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

/** 같은 날짜의 행(캠페인·광고그룹 중복 등)을 합산해 날짜 오름차순으로 반환 */
export function totalsByDate(metrics: AdMetric[]): DayTotals[] {
  const map = new Map<string, DayTotals>()
  for (const m of metrics) {
    const t = map.get(m.date) ?? {
      date: m.date,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    t.spend += m.spend
    t.impressions += m.impressions
    t.clicks += m.clicks
    t.conversions += m.conversions
    t.revenue += m.revenue
    map.set(m.date, t)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** 대상일 합계. 데이터가 없으면 null */
export function targetDay(ctx: DetectionContext): DayTotals | null {
  return (
    totalsByDate(ctx.series.metrics).find(d => d.date === ctx.targetDate) ??
    null
  )
}

export type Comparison =
  | {
      ok: true
      target: DayTotals
      /** 전일 값 또는 직전 7일 일평균 */
      baseline: DayTotals
      mode: 'previous-day' | 'average'
    }
  | { ok: false; reason: string }

/**
 * 공통 비교 기준: 대상일 이전 데이터가 7일 미만이면 전일,
 * 7일 이상이면 직전 7일(대상일-7 ~ 대상일-1) 일평균.
 */
export function compare(ctx: DetectionContext): Comparison {
  const days = totalsByDate(ctx.series.metrics)
  const target = targetDay(ctx)
  if (!target) return { ok: false, reason: '대상일 데이터 없음' }

  const prior = days.filter(d => d.date < ctx.targetDate)
  const n = COMMON_RULE_CONFIG.comparisonDays

  if (prior.length < n) {
    const prev = prior.find(d => d.date === addDays(ctx.targetDate, -1))
    if (!prev) return { ok: false, reason: '전일 데이터 없음' }
    return { ok: true, target, baseline: prev, mode: 'previous-day' }
  }

  const from = addDays(ctx.targetDate, -n)
  const window = prior.filter(d => d.date >= from)
  if (window.length === 0) {
    return { ok: false, reason: '직전 7일 데이터 없음' }
  }
  const sum = window.reduce(
    (a, d) => ({
      ...a,
      spend: a.spend + d.spend,
      impressions: a.impressions + d.impressions,
      clicks: a.clicks + d.clicks,
      conversions: a.conversions + d.conversions,
      revenue: a.revenue + d.revenue,
    }),
    {
      date: from,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
  )
  const k = window.length
  return {
    ok: true,
    target,
    mode: 'average',
    baseline: {
      date: from,
      spend: sum.spend / k,
      impressions: sum.impressions / k,
      clicks: sum.clicks / k,
      conversions: sum.conversions / k,
      revenue: sum.revenue / k,
    },
  }
}

/** 최소 규모 필터: 비용이 기준 미만이면 평가 제외 */
export function belowMinSpend(spend: number): boolean {
  return spend < COMMON_RULE_CONFIG.minSpend
}

/** 규칙에 저장된 임계값, 없으면 rules.config.ts 기본값 */
export function threshold(ctx: DetectionContext, key: string): number {
  const v = ctx.rule.threshold[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return RULE_DEFAULTS[ctx.rule.rule_code].threshold[key]
}

export const gte = (a: number, b: number) => a >= b - EPS
export const lte = (a: number, b: number) => a <= b + EPS

export const changeRate = (actual: number, baseline: number) =>
  (actual - baseline) / baseline

export const round = (v: number, digits = 2) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

export const ctrPercent = (clicks: number, impressions: number) =>
  (clicks / impressions) * 100

export function skip(reason: string): DetectionResult {
  return { triggered: false, skipped: true, skipReason: reason }
}

export function pass(): DetectionResult {
  return { triggered: false, skipped: false }
}

const LOWER: Record<Severity, Severity> = {
  critical: 'high',
  high: 'medium',
  // 가장 낮은 단계라 더 내릴 수 없다 — 안내 문구만 붙는다
  medium: 'medium',
}

export function lowerSeverity(s: Severity): Severity {
  return LOWER[s]
}

/** 규칙 위반 결과. 주말·공휴일 완화 대상 규칙이면 심각도를 한 단계 낮춘다 */
export function hit(
  ctx: DetectionContext,
  values: { baseline: number; actual: number }
): DetectionResult {
  const code: RuleCode = ctx.rule.rule_code
  const mitigate =
    ctx.isWeekendOrHoliday && RULE_DEFAULTS[code].weekendMitigation
  return {
    triggered: true,
    skipped: false,
    severity: mitigate ? lowerSeverity(ctx.rule.severity) : ctx.rule.severity,
    baselineValue: values.baseline,
    actualValue: values.actual,
    weekendNote: mitigate ? WEEKEND_NOTE : undefined,
    detectionKey: buildDetectionKey(code, ctx.series.target, ctx.targetDate),
  }
}
