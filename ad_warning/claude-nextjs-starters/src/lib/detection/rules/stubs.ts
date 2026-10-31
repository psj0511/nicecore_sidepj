import type { RuleEvaluator } from '@/types'
import { skip } from './common'

/** R7 예산 조기 소진 — 시간대 데이터가 들어오면 구현 (2단계) */
export const evaluateR7: RuleEvaluator = () =>
  skip('시간대 데이터 없음 (2단계)')

/** R8 비즈머니 부족 — 잔액 데이터가 들어오면 구현 (2단계) */
export const evaluateR8: RuleEvaluator = () => skip('잔액 데이터 없음 (2단계)')
