import type { RuleCode, RuleStage, Severity } from '@/types'

/** 공통 원칙 (docs/detection-rules.md) */
export const COMMON_RULE_CONFIG = {
  /** 기준일 비용이 이 값 미만이면 평가 제외 (원) */
  minSpend: 100_000,
  /** 비교 기간 일수. 미만이면 전일, 이상이면 직전 N일 평균 */
  comparisonDays: 7,
} as const

export interface RuleDefault {
  code: RuleCode
  type: string
  severity: Severity
  stage: RuleStage
  /** 비율은 소수 (0.5 = 50%) */
  threshold: Record<string, number>
  /** 주말·공휴일 완화(심각도 한 단계 하향) 대상 */
  weekendMitigation: boolean
  suspectedCauses: string[]
}

export const RULE_DEFAULTS: Record<RuleCode, RuleDefault> = {
  R1: {
    code: 'R1',
    type: '비용 급증',
    severity: 'high',
    stage: 1,
    threshold: { costChangeRate: 0.5 },
    weekendMitigation: false,
    suspectedCauses: ['입찰가 오설정', '예산 변경'],
  },
  R2: {
    code: 'R2',
    type: '노출 급감',
    severity: 'high',
    stage: 1,
    threshold: { impressionChangeRate: -0.6 },
    weekendMitigation: false,
    suspectedCauses: ['소재 비승인', '중단', '비즈머니·결제 문제'],
  },
  R3: {
    code: 'R3',
    type: 'CTR 급락',
    severity: 'medium',
    stage: 1,
    threshold: { ctrChangeRate: -0.3, minBaselineImpressions: 3000 },
    weekendMitigation: false,
    suspectedCauses: ['소재 피로', '매칭 변경', '순위 하락'],
  },
  R4: {
    code: 'R4',
    type: '전환 0',
    severity: 'critical',
    stage: 1,
    threshold: { minSpend: 100_000, minBaselineConversions: 1 },
    weekendMitigation: true,
    suspectedCauses: ['전환 추적 태그 오류'],
  },
  R5: {
    code: 'R5',
    type: 'CPA/ROAS 이탈',
    severity: 'medium',
    stage: 1,
    // 리드형: CPA가 목표 대비 +30% 이상 / 이커머스형: ROAS가 목표 ×0.7 이하
    threshold: { cpaIncreaseRate: 0.3, roasRatio: 0.7 },
    weekendMitigation: true,
    suspectedCauses: ['입찰 전략', '시즌성'],
  },
  R6: {
    code: 'R6',
    type: '클릭 급증',
    severity: 'high',
    stage: 1,
    threshold: { clickChangeRate: 2.0, conversionChangeRate: 0.2 },
    weekendMitigation: false,
    suspectedCauses: ['부정 클릭'],
  },
  R7: {
    code: 'R7',
    type: '예산 조기 소진',
    severity: 'high',
    stage: 2,
    threshold: {},
    weekendMitigation: false,
    suspectedCauses: ['입찰 과다'],
  },
  R8: {
    code: 'R8',
    type: '비즈머니 부족',
    severity: 'critical',
    stage: 2,
    threshold: {},
    weekendMitigation: false,
    suspectedCauses: ['충전 누락'],
  },
}

export const WEEKEND_NOTE = '주말·공휴일 가능성'

/** 감지 키: 규칙+대상+날짜 */
export function buildDetectionKey(
  ruleCode: RuleCode,
  target: string,
  date: string
) {
  return `${ruleCode}|${target}|${date}`
}
