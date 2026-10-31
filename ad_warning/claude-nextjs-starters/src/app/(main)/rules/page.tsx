import { PageShell } from '@/components/layout/page-shell'
import { RulesManager } from '@/components/rules/rules-manager'
import { listRules } from '@/lib/repositories/rules'

export const dynamic = 'force-dynamic'

export default async function RulesPage() {
  const rules = await listRules()
  return (
    <PageShell
      title="감지 규칙 관리"
      description="이상 감지 규칙 R1~R8 임계값 설정"
    >
      <RulesManager initialRules={rules} />
    </PageShell>
  )
}
