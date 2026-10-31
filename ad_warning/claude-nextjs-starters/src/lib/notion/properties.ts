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

/**
 * 표준 속성명 외에 허용하는 별칭 (구글 Ads·네이버 검색광고 보고서 원본 CSV 헤더).
 * 표준 속성명이 있으면 그것을 우선하고, 없으면 별칭을 앞에서부터 찾는다
 */
export const METRIC_PROPERTY_ALIASES: Record<MetricField, string[]> = {
  date: ['보고일', '일별'],
  channel: ['매체'],
  campaign: [],
  adGroup: [],
  spend: ['비용', '총비용(VAT포함,원)'],
  impressions: ['노출수'],
  clicks: ['클릭수'],
  conversions: ['전환수', '총전환수'],
  revenue: ['전환 가치', '총전환매출액(원)'],
}

/** 이 필드에 해당하는 속성을 실제 속성 목록에서 찾아 그 이름을 반환 (없으면 undefined) */
export function resolveMetricProperty(
  field: MetricField,
  present: Record<string, unknown>
): string | undefined {
  return [METRIC_PROPERTY_NAMES[field], ...METRIC_PROPERTY_ALIASES[field]].find(
    name => name in present
  )
}

/** 비어 있어도 되는 속성 */
export const OPTIONAL_METRIC_FIELDS: MetricField[] = ['adGroup']

/** 채널 속성 값 → 내부 값 */
export const CHANNEL_VALUE_MAP: Record<string, 'google' | 'naver'> = {
  구글: 'google',
  google: 'google',
  네이버: 'naver',
  naver: 'naver',
}
