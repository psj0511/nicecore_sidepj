'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { SeverityBadge } from '@/components/domain/severity-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { saveRuleAction } from '@/lib/actions/rules'
import { THRESHOLD_FIELDS } from '@/lib/detection/rule-display'
import type { RuleFormValues } from '@/lib/validations/rule'
import type { DetectionRule } from '@/types'
import { RuleFormDialog } from './rule-form-dialog'

function summarize(rule: DetectionRule) {
  if (rule.stage === 2) return '-'
  const parts = Object.entries(rule.threshold).map(([k, v]) => {
    const m = THRESHOLD_FIELDS[k]
    return `${m?.label.split(' (')[0] ?? k} ${Math.round(v * (m?.scale ?? 1) * 1000) / 1000}${m?.unit ?? ''}`
  })
  if (rule.rule_code === 'R5') {
    parts.push(
      rule.target_value == null
        ? '목표값 미설정'
        : `목표 ${rule.target_type === 'roas' ? 'ROAS' : 'CPA'} ${rule.target_value}`
    )
  }
  return parts.join(' · ')
}

/** 더미 단계: 변경은 로컬 상태만 반영 (Task 009에서 Server Action 연동) */
export function RulesManager({
  initialRules,
}: {
  initialRules: DetectionRule[]
}) {
  const [rules, setRules] = useState(initialRules)
  const [editing, setEditing] = useState<DetectionRule | null>(null)

  const patch = (id: string, p: Partial<DetectionRule>) =>
    setRules(prev => prev.map(r => (r.id === id ? { ...r, ...p } : r)))

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>규칙</TableHead>
              <TableHead>심각도</TableHead>
              <TableHead>임계값</TableHead>
              <TableHead>활성</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map(rule => {
              const stage2 = rule.stage === 2
              return (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    {rule.rule_code} {rule.type}
                    {stage2 && (
                      <Badge variant="outline" className="ml-2">
                        2단계 데이터 필요
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={rule.severity} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md text-sm">
                    {summarize(rule)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      disabled={stage2}
                      aria-label={`${rule.rule_code} 활성`}
                      onCheckedChange={async on => {
                        const res = await saveRuleAction(rule.id, {
                          threshold: rule.threshold,
                          targetType: rule.target_type ?? undefined,
                          targetValue: rule.target_value,
                          isActive: on,
                        })
                        if (!res.ok) {
                          toast.error(res.error)
                          return
                        }
                        patch(rule.id, { is_active: on })
                        toast.success(
                          `${rule.rule_code} ${on ? '활성화' : '비활성화'}했습니다`
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={stage2}
                      onClick={() => setEditing(rule)}
                    >
                      수정
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <RuleFormDialog
        rule={editing}
        onClose={() => setEditing(null)}
        onSave={async (id, v: RuleFormValues) => {
          const res = await saveRuleAction(id, {
            ...v,
            isActive: editing?.is_active ?? v.isActive,
          })
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          patch(id, {
            threshold: v.threshold,
            target_value: v.targetValue ?? null,
            target_type:
              editing?.rule_code === 'R5' ? (v.targetType ?? 'cpa') : null,
          })
          setEditing(null)
          toast.success('규칙을 저장했습니다')
        }}
      />
    </>
  )
}
