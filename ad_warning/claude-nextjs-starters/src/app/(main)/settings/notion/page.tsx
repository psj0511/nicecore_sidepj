import { PageShell } from '@/components/layout/page-shell'
import { NotionSettingsForm } from '@/components/settings/notion-settings-form'
import { MOCK_NOTION_CONNECTED, mockConnectionTest } from '@/lib/mock'

export default async function NotionSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  // 오픈 리다이렉트 방지: 내부 경로만 허용
  const safeReturn =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : undefined

  return (
    <PageShell
      title="Notion 연동 설정"
      description="토큰, 부모 페이지, 티켓 데이터베이스 설정"
    >
      <NotionSettingsForm
        initiallyConnected={MOCK_NOTION_CONNECTED}
        maskedToken="secret_••••••••"
        testResult={mockConnectionTest}
        returnTo={safeReturn}
      />
    </PageShell>
  )
}
