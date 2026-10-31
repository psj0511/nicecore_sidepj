import type { AdMetric, DetectionRule } from './models'
import type { Channel, Severity } from './enums'

/** 평가 대상 한 건(구글 캠페인 / 네이버 광고그룹)의 일자별 지표 */
export interface TargetSeries {
  channel: Channel
  target: string
  /** 날짜 오름차순 */
  metrics: AdMetric[]
}

export interface DetectionContext {
  syncId: string
  series: TargetSeries
  /** 평가 기준일(YYYY-MM-DD) */
  targetDate: string
  rule: DetectionRule
  /** 주말·공휴일 판정 */
  isWeekendOrHoliday: boolean
}

export interface DetectionResult {
  /** 규칙 위반 여부 */
  triggered: boolean
  /** 최소 규모 필터·데이터 부족 등으로 평가하지 않음 */
  skipped: boolean
  skipReason?: string
  severity?: Severity
  baselineValue?: number
  actualValue?: number
  weekendNote?: string
  detectionKey?: string
}

/** 규칙 평가기. 순수 함수여야 한다 */
export type RuleEvaluator = (ctx: DetectionContext) => DetectionResult
