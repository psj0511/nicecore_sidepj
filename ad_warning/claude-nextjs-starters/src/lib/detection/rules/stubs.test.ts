import { describe, expect, it } from 'vitest'
import { EVALUATORS } from '.'
import { context, twoDays } from './test-utils'

describe('R7·R8 (2단계)', () => {
  it.each(['R7', 'R8'] as const)('%s 는 데이터가 없어 건너뛴다', code => {
    const r = EVALUATORS[code](context(code, twoDays({}, {})))
    expect(r).toMatchObject({ triggered: false, skipped: true })
    expect(r.skipReason).toContain('2단계')
  })
})
