/** Notion 성과 데이터베이스 속성명 매핑 (CSV 헤더와 일치해야 함). 단일 정의 지점 */
export const METRIC_PROPERTY_NAMES = {
  date: '날짜',
  channel: '채널',
  campaign: '캠페인',
  adGroup: '광고그룹',
  spend: '광고비',
  impressions: '노출',
  clicks: '클릭',
  conversions: '전환',
  revenue: '매출',
} as const

export type MetricField = keyof typeof METRIC_PROPERTY_NAMES

/** 비어 있어도 되는 속성 */
export const OPTIONAL_METRIC_FIELDS: MetricField[] = ['adGroup']

/** 채널 속성 값 → 내부 값 */
export const CHANNEL_VALUE_MAP: Record<string, 'google' | 'naver'> = {
  구글: 'google',
  google: 'google',
  네이버: 'naver',
  naver: 'naver',
}
