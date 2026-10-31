import 'server-only'
import { getNotion, queryAll } from '@/lib/notion/client'
import { getStorePage, propsOf } from '@/lib/notion/pages'
import { read, write } from '@/lib/notion/props'
import { getStore } from '@/lib/notion/store'
import type {
  DetectionRule,
  R5TargetType,
  RuleCode,
  RuleStage,
  RuleThreshold,
  Severity,
} from '@/types'
import type { PageObjectResponse } from '@notionhq/client'

function parseThreshold(raw: string): RuleThreshold {
  try {
    const v: unknown = JSON.parse(raw || '{}')
    return v && typeof v === 'object' ? (v as RuleThreshold) : {}
  } catch {
    return {}
  }
}

function toRule(page: PageObjectResponse): DetectionRule {
  const p = propsOf(page)
  return {
    id: page.id,
    rule_code: read.title(p, '규칙코드') as RuleCode,
    type: read.text(p, '유형'),
    severity: (read.select(p, '심각도') ?? 'medium') as Severity,
    threshold: parseThreshold(read.text(p, '임계값')),
    target_value: read.numOrNull(p, '목표값'),
    target_type: read.select(p, '목표유형') as R5TargetType | null,
    is_active: read.checkbox(p, '활성'),
    stage: (read.num(p, '단계') || 1) as RuleStage,
  }
}

export async function listRules(): Promise<DetectionRule[]> {
  const store = await getStore()
  const pages = await queryAll({ data_source_id: store.rules })
  return pages
    .map(toRule)
    .sort((a, b) => a.rule_code.localeCompare(b.rule_code))
}

export interface RuleUpdate {
  threshold: RuleThreshold
  target_type: R5TargetType | null
  target_value: number | null
  is_active: boolean
}

export async function updateRule(
  id: string,
  patch: RuleUpdate
): Promise<DetectionRule> {
  if (!(await getStorePage('rules', id))) {
    throw new Error('규칙을 찾을 수 없습니다')
  }
  const page = await getNotion().pages.update({
    page_id: id,
    properties: {
      임계값: write.text(JSON.stringify(patch.threshold)),
      목표유형: write.select(patch.target_type),
      목표값: write.num(patch.target_value),
      활성: write.checkbox(patch.is_active),
    } as never,
  })
  return toRule(page as PageObjectResponse)
}
