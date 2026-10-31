import 'server-only'
import { listMetrics } from '@/lib/notion/sources'
import { insertIssuesIgnoreDuplicates } from '@/lib/repositories/issues'
import { listRules } from '@/lib/repositories/rules'
import { createDetectionRunner } from './run'

/**
 * 최신 성과 데이터(Notion 실시간 조회, 2분 캐시)에 활성 규칙을 실행하고
 * 새 이슈를 저장한다. 같은 감지 키는 한 번만 만들어진다.
 */
export const runDetection = createDetectionRunner({
  listRules,
  // 전체 이력을 읽어야 직전 7일 평균을 낼 수 있다. 평가는 대상별 최신일만 한다
  listMetrics: () => listMetrics({ from: '0000-01-01', to: '9999-12-31' }),
  insertIssues: insertIssuesIgnoreDuplicates,
})
