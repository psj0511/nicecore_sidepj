import { PageShell } from '@/components/layout/page-shell'
import { NotionSettingsPanel } from '@/components/settings/notion-settings-form'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

/** 토큰은 앞 4자리만 보여 주고 나머지는 마스킹한다 */
function maskToken(token: string) {
  return `${token.slice(0, 4)}${'•'.repeat(8)}`
}

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
      description="환경 변수로 설정된 토큰, 부모 페이지, 티켓 데이터베이스의 연결 상태"
    >
      <NotionSettingsPanel
        items={[
          {
            name: 'NOTION_TOKEN',
            label: 'Notion 토큰',
            value: env.NOTION_TOKEN ? maskToken(env.NOTION_TOKEN) : null,
          },
          {
            name: 'NOTION_PARENT_PAGE_ID',
            label: '성과 데이터 부모 페이지',
            value: env.NOTION_PARENT_PAGE_ID ?? null,
          },
          {
            name: 'NOTION_DATABASE_ID',
            label: '티켓 데이터베이스',
            value: env.NOTION_DATABASE_ID ?? null,
          },
        ]}
        returnTo={safeReturn}
      />
    </PageShell>
  )
}
