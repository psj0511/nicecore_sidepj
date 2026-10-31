export const CHANNELS = ['google', 'naver'] as const
export type Channel = (typeof CHANNELS)[number]
export const CHANNEL_LABELS: Record<Channel, string> = {
  google: '구글',
  naver: '네이버',
}

export const SEVERITIES = ['critical', 'high', 'medium'] as const
export type Severity = (typeof SEVERITIES)[number]
export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '긴급',
  high: '높음',
  medium: '보통',
}

export const ISSUE_STATUSES = [
  'new',
  'in_progress',
  'resolved',
  'ignored',
] as const
export type IssueStatus = (typeof ISSUE_STATUSES)[number]
export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  new: '신규',
  in_progress: '진행중',
  resolved: '해결',
  ignored: '무시',
}

export const SYNC_STATUSES = ['success', 'failed'] as const
export type SyncStatus = (typeof SYNC_STATUSES)[number]
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  success: '성공',
  failed: '실패',
}

export const RULE_CODES = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
] as const
export type RuleCode = (typeof RULE_CODES)[number]

/** 1단계: R1~R6, 2단계: R7·R8 (추가 데이터 필요) */
export const RULE_STAGES = [1, 2] as const
export type RuleStage = (typeof RULE_STAGES)[number]

/** R5 목표값 유형: 리드형 CPA / 이커머스형 ROAS */
export const R5_TARGET_TYPES = ['cpa', 'roas'] as const
export type R5TargetType = (typeof R5_TARGET_TYPES)[number]
