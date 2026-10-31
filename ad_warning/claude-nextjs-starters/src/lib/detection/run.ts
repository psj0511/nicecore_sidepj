import type { AdMetric, DetectionRule } from '@/types'
import { detect, type IssueDraft } from './engine'

export interface DetectionDeps {
  listRules: () => Promise<DetectionRule[]>
  listMetrics: () => Promise<AdMetric[]>
  /** 감지 키 중복은 무시하고 새로 만든 건수를 반환 */
  insertIssues: (rows: IssueDraft[]) => Promise<number>
}

export interface DetectionSummary {
  /** 새로 생성된 이슈 수 */
  created: number
  /** 이번 실행에서 위반으로 감지된 건수 (이미 있던 이슈 포함) */
  detected: number
  /** 규칙을 실제로 평가한 횟수 */
  evaluated: number
  /** 최소 규모·데이터 부족 등으로 평가 제외된 횟수 */
  skipped: number
  ranAt: string
}

/**
 * 감지 실행기를 만든다. 실행 중에 다시 호출되면 새로 시작하지 않고 진행 중인
 * 실행의 결과를 공유한다 (Notion 에는 유니크 제약이 없어 동시 실행 시 이슈가 중복된다).
 */
export function createDetectionRunner(deps: DetectionDeps) {
  let inflight: Promise<DetectionSummary> | undefined

  async function run(): Promise<DetectionSummary> {
    const [rules, metrics] = await Promise.all([
      deps.listRules(),
      deps.listMetrics(),
    ])
    const result = detect(metrics, rules)
    const created = await deps.insertIssues(result.issues)
    return {
      created,
      detected: result.issues.length,
      evaluated: result.evaluated,
      skipped: result.skipped,
      ranAt: new Date().toISOString(),
    }
  }

  return function runDetection(): Promise<DetectionSummary> {
    inflight ??= run().finally(() => {
      inflight = undefined
    })
    return inflight
  }
}
