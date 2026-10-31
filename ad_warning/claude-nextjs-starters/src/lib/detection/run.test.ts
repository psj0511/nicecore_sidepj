import { describe, expect, it, vi } from 'vitest'
import { createDetectionRunner, type DetectionDeps } from './run'
import { makeRule, row } from './rules/test-utils'

const spike = [
  row('2026-11-03', { spend: 200_000 }),
  row('2026-11-04', { spend: 400_000 }),
]

function deps(over: Partial<DetectionDeps> = {}): DetectionDeps {
  return {
    listRules: async () => [makeRule('R1')],
    listMetrics: async () => spike,
    insertIssues: async rows => rows.length,
    ...over,
  }
}

describe('createDetectionRunner', () => {
  it('감지 결과를 저장하고 요약을 반환한다', async () => {
    const insertIssues = vi.fn(async (rows: unknown[]) => rows.length)
    const s = await createDetectionRunner(deps({ insertIssues }))()
    expect(insertIssues).toHaveBeenCalledOnce()
    expect(s).toMatchObject({
      created: 1,
      detected: 1,
      evaluated: 1,
      skipped: 0,
    })
  })

  it('이미 있는 이슈는 created 에 포함되지 않는다 (중복 방지)', async () => {
    const s = await createDetectionRunner(
      deps({ insertIssues: async () => 0 })
    )()
    expect(s).toMatchObject({ created: 0, detected: 1 })
  })

  it('비활성 규칙은 적용하지 않는다', async () => {
    const s = await createDetectionRunner(
      deps({ listRules: async () => [{ ...makeRule('R1'), is_active: false }] })
    )()
    expect(s).toMatchObject({ created: 0, detected: 0, evaluated: 0 })
  })

  it('임계값을 바꾼 뒤 다시 실행하면 결과가 달라진다', async () => {
    let threshold = 0.5
    const run = createDetectionRunner(
      deps({
        listRules: async () => [
          { ...makeRule('R1'), threshold: { costChangeRate: threshold } },
        ],
      })
    )
    expect((await run()).detected).toBe(1)
    threshold = 1.5
    expect((await run()).detected).toBe(0)
  })

  it('평가 제외 건수를 반환한다', async () => {
    const s = await createDetectionRunner(
      deps({ listMetrics: async () => [row('2026-11-04')] })
    )()
    expect(s).toMatchObject({ evaluated: 0, skipped: 1 })
  })

  it('동시 호출은 한 번의 실행을 공유한다', async () => {
    const insertIssues = vi.fn(async (rows: unknown[]) => rows.length)
    const run = createDetectionRunner(deps({ insertIssues }))
    const [a, b, c] = await Promise.all([run(), run(), run()])
    expect(insertIssues).toHaveBeenCalledOnce()
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('끝난 뒤에는 새로 실행하고, 실패해도 다음 호출이 막히지 않는다', async () => {
    let fail = true
    const listMetrics = vi.fn(async () => {
      if (fail) throw new Error('Notion 장애')
      return spike
    })
    const run = createDetectionRunner(deps({ listMetrics }))
    await expect(run()).rejects.toThrow('Notion 장애')
    fail = false
    await expect(run()).resolves.toMatchObject({ created: 1 })
    await run()
    expect(listMetrics).toHaveBeenCalledTimes(3)
  })
})
