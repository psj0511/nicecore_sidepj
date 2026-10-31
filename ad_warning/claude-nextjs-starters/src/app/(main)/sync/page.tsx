import { PageShell } from '@/components/layout/page-shell'
import { SyncManager } from '@/components/sync/sync-manager'
import {
  MOCK_NOTION_CONNECTED,
  mockDetectionSummary,
  mockNotionDatabases,
  mockValidationErrors,
} from '@/lib/mock'
import { listSyncs } from '@/lib/repositories/syncs'

export const dynamic = 'force-dynamic'

export default async function SyncPage() {
  const syncs = await listSyncs()
  // TODO(Task 007): Notion 데이터베이스 탐색·검증 오류·감지 요약은 동기화 구현 시 교체
  return (
    <PageShell
      title="데이터 수집 관리"
      description="Notion 성과 데이터베이스 동기화와 이력"
    >
      <SyncManager
        connected={MOCK_NOTION_CONNECTED}
        databases={mockNotionDatabases}
        initialSyncs={syncs}
        errors={mockValidationErrors}
        summary={mockDetectionSummary}
      />
    </PageShell>
  )
}
