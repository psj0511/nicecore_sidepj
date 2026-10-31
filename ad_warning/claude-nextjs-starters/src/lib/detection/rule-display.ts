import type { RuleCode } from '@/types'
import { formatKRW, formatNumber } from '@/lib/format'

/** 이슈 상세의 기준값/실제값 표시용 지표명과 포맷터 */
export const RULE_DISPLAY: Record<
  RuleCode,
  { metric: string; format: (v: number) => string }
> = {
  R1: { metric: '광고비', format: formatKRW },
  R2: { metric: '노출수', format: formatNumber },
  R3: { metric: 'CTR', format: v => `${v}%` },
  R4: { metric: '전환수', format: v => `${formatNumber(v)}건` },
  R5: { metric: 'CPA', format: formatKRW },
  R6: { metric: '클릭수', format: formatNumber },
  R7: { metric: '예산 소진 시각', format: v => String(v) },
  R8: { metric: '비즈머니 잔액', format: formatKRW },
}

export interface ThresholdFieldMeta {
  label: string
  unit: string
  /** 화면 입력값 = 저장값 × scale (비율은 %로 표시) */
  scale: number
}

export const THRESHOLD_FIELDS: Record<string, ThresholdFieldMeta> = {
  costChangeRate: { label: '비용 변화율 (이상)', unit: '%', scale: 100 },
  impressionChangeRate: { label: '노출 변화율 (이하)', unit: '%', scale: 100 },
  ctrChangeRate: { label: 'CTR 변화율 (이하)', unit: '%', scale: 100 },
  minBaselineImpressions: { label: '기준일 최소 노출', unit: '회', scale: 1 },
  minSpend: { label: '당일 최소 비용', unit: '원', scale: 1 },
  minBaselineConversions: { label: '기준일 최소 전환', unit: '건', scale: 1 },
  cpaIncreaseRate: {
    label: '리드형: CPA 목표 대비 상승률 (이상)',
    unit: '%',
    scale: 100,
  },
  roasRatio: {
    label: '이커머스형: ROAS 목표 대비 비율 (이하)',
    unit: '배',
    scale: 1,
  },
  clickChangeRate: { label: '클릭 변화율 (이상)', unit: '%', scale: 100 },
  conversionChangeRate: { label: '전환 변화율 (이하)', unit: '%', scale: 100 },
}
