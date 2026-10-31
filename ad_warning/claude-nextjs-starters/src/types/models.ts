import type {
  Channel,
  R5TargetType,
  IssueStatus,
  RuleCode,
  RuleStage,
  Severity,
} from './enums'

export interface AdMetric {
  id: string
  /** 성과 데이터가 있는 Notion 데이터베이스 ID */
  source_id: string
  /** YYYY-MM-DD */
  date: string
  channel: Channel
  campaign: string
  /** 네이버 평가 단위. 구글은 비어 있을 수 있음 */
  ad_group: string | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

/** 규칙별 임계값. 키는 rules.config.ts 의 기본값과 동일 */
export type RuleThreshold = Record<string, number>

export interface DetectionRule {
  id: string
  rule_code: RuleCode
  type: string
  severity: Severity
  threshold: RuleThreshold
  /** R5 목표 CPA(원) 또는 ROAS(배수). 미설정 시 null */
  target_value: number | null
  /** R5 목표값 유형 (리드형 CPA / 이커머스형 ROAS). R5 외에는 null */
  target_type: R5TargetType | null
  is_active: boolean
  stage: RuleStage
}

export interface Issue {
  id: string
  rule_id: string
  /** 감지 대상이 속한 성과 Notion 데이터베이스 ID */
  source_id: string
  /** 구글=캠페인, 네이버=광고그룹 */
  target: string
  target_date: string
  /** 규칙+대상+날짜. 중복 방지용 unique */
  detection_key: string
  severity: Severity
  status: IssueStatus
  baseline_value: number
  actual_value: number
  weekend_note: string | null
  memo: string | null
  detected_at: string
  notion_url: string | null
}
