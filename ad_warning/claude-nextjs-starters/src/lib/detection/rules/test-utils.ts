import type {
  AdMetric,
  DetectionContext,
  DetectionRule,
  RuleCode,
} from '@/types'
import { addDays } from '../calendar'
import { RULE_DEFAULTS } from '../rules.config'

/** 대상일. 데이터 7일 미만 시나리오는 전일(BASE_DAY)과 비교한다 */
export const TARGET_DAY = '2026-11-04'
export const BASE_DAY = '2026-11-03'

const DEFAULT_METRIC = {
  spend: 200_000,
  impressions: 10_000,
  clicks: 500,
  conversions: 10,
  revenue: 1_000_000,
}

export function row(date: string, o: Partial<AdMetric> = {}): AdMetric {
  return {
    id: `${date}-${o.campaign ?? 'c1'}-${o.ad_group ?? ''}`,
    source_id: 'src1',
    date,
    channel: 'google',
    campaign: 'c1',
    ad_group: null,
    ...DEFAULT_METRIC,
    ...o,
  }
}

export function makeRule(
  code: RuleCode,
  o: Partial<DetectionRule> = {}
): DetectionRule {
  const d = RULE_DEFAULTS[code]
  return {
    id: `rule-${code}`,
    rule_code: code,
    type: d.type,
    severity: d.severity,
    threshold: { ...d.threshold },
    target_value: null,
    target_type: null,
    is_active: d.stage === 1,
    stage: d.stage,
    ...o,
  }
}

/** 전일 + 대상일, 2일치 데이터 (비교 기준 = 전일) */
export function twoDays(
  base: Partial<AdMetric>,
  target: Partial<AdMetric>
): AdMetric[] {
  return [row(BASE_DAY, base), row(TARGET_DAY, target)]
}

/**
 * 직전 7일(대상일-7 ~ 대상일-1) + 대상일. baselines 는 7개 이하의 일별 값이며
 * 마지막 값이 전일이다 (비교 기준 = 직전 7일 일평균).
 */
export function weekHistory(
  baselines: Partial<AdMetric>[],
  target: Partial<AdMetric>
): AdMetric[] {
  const n = baselines.length
  return [
    ...baselines.map((b, i) => row(addDays(TARGET_DAY, i - n), b)),
    row(TARGET_DAY, target),
  ]
}

export function context(
  code: RuleCode,
  metrics: AdMetric[],
  o: {
    rule?: Partial<DetectionRule>
    weekend?: boolean
    targetDate?: string
  } = {}
): DetectionContext {
  return {
    sourceId: 'src1',
    series: { channel: 'google', target: 'c1', metrics },
    targetDate: o.targetDate ?? TARGET_DAY,
    rule: makeRule(code, o.rule),
    isWeekendOrHoliday: o.weekend ?? false,
  }
}
