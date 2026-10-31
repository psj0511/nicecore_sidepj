import { RULE_DISPLAY } from '@/lib/detection/rule-display'
import { SEVERITY_LABELS, type DetectionRule, type Issue } from '@/types'

/** 티켓 데이터베이스가 가져야 하는 속성 (이름 → Notion 속성 타입) */
export const TICKET_PROPERTIES = {
  제목: 'title',
  규칙: 'rich_text',
  대상: 'rich_text',
  심각도: 'select',
  '감지 근거': 'rich_text',
  감지일: 'date',
} as const

export function ticketTitle(issue: Issue, rule?: DetectionRule) {
  return `[${SEVERITY_LABELS[issue.severity]}] ${rule?.type ?? '이상 감지'} · ${issue.target}`
}

/** 감지 근거 한 줄 요약 (기준값/실제값은 규칙별 단위로 표시) */
export function ticketEvidence(issue: Issue, rule?: DetectionRule) {
  const display = rule ? RULE_DISPLAY[rule.rule_code] : undefined
  const fmt = display?.format ?? String
  const metric = display?.metric ?? '지표'
  const lines = [
    `${metric}: 기준 ${fmt(issue.baseline_value)} → 실제 ${fmt(issue.actual_value)}`,
    `대상일: ${issue.target_date}`,
  ]
  if (issue.weekend_note) lines.push(issue.weekend_note)
  return lines.join('\n')
}

const rich = (v: string) => [
  { type: 'text' as const, text: { content: v.slice(0, 2000) } },
]

/** 티켓 DB 속성 값 (제목, 규칙, 심각도, 감지 근거, 대상, 감지일) */
export function buildTicketProperties(issue: Issue, rule?: DetectionRule) {
  return {
    제목: { title: rich(ticketTitle(issue, rule)) },
    규칙: {
      rich_text: rich(rule ? `${rule.rule_code} ${rule.type}` : issue.rule_id),
    },
    대상: { rich_text: rich(issue.target) },
    심각도: { select: { name: SEVERITY_LABELS[issue.severity] } },
    '감지 근거': { rich_text: rich(ticketEvidence(issue, rule)) },
    감지일: { date: { start: issue.detected_at.slice(0, 10) } },
  }
}

/** 티켓 DB 스키마에서 누락되었거나 타입이 다른 속성을 한국어 메시지로 반환 */
export function findSchemaProblems(
  properties: Record<string, { type: string }>
): string[] {
  return Object.entries(TICKET_PROPERTIES).flatMap(([name, type]) => {
    const prop = properties[name]
    if (!prop) return [`티켓 데이터베이스에 '${name}' 속성이 없습니다`]
    if (prop.type !== type) {
      return [`'${name}' 속성은 ${type} 타입이어야 합니다 (현재 ${prop.type})`]
    }
    return []
  })
}
