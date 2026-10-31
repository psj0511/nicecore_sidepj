import type { RuleCode, RuleEvaluator } from '@/types'
import { evaluateR1 } from './r1'
import { evaluateR2 } from './r2'
import { evaluateR3 } from './r3'
import { evaluateR4 } from './r4'
import { evaluateR5 } from './r5'
import { evaluateR6 } from './r6'
import { evaluateR7, evaluateR8 } from './stubs'

export const EVALUATORS: Record<RuleCode, RuleEvaluator> = {
  R1: evaluateR1,
  R2: evaluateR2,
  R3: evaluateR3,
  R4: evaluateR4,
  R5: evaluateR5,
  R6: evaluateR6,
  R7: evaluateR7,
  R8: evaluateR8,
}
