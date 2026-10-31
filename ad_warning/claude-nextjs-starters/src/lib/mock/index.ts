import {
  RULE_DEFAULTS,
  WEEKEND_NOTE,
  buildDetectionKey,
} from '@/lib/detection/rules.config'
import { RULE_CODES } from '@/types'
import type { AdMetric, DataSync, DetectionRule, Issue } from '@/types'
import type { DailyMetric } from '@/components/domain/metric-trend-chart'

const BASE_DATE = new Date('2026-10-30T00:00:00Z')

function dateOffset(daysAgo: number) {
  const d = new Date(BASE_DATE)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export const mockSyncs: DataSync[] = [
  {
    id: 'sync-1',
    notion_database_id: 'a'.repeat(32),
    title: '구글 광고 성과 10월',
    status: 'success',
    row_count: 120,
    synced_at: '2026-10-30T09:00:00Z',
  },
  {
    id: 'sync-2',
    notion_database_id: 'b'.repeat(32),
    title: '네이버 광고 성과 10월',
    status: 'success',
    row_count: 90,
    synced_at: '2026-10-29T09:00:00Z',
  },
  {
    id: 'sync-3',
    notion_database_id: 'c'.repeat(32),
    title: '네이버 광고 성과 9월',
    status: 'failed',
    row_count: 0,
    synced_at: '2026-10-28T09:00:00Z',
  },
]

/** 결정적 의사 난수 (SSR/CSR 불일치 방지) */
function wave(i: number, amp: number) {
  return 1 + Math.sin(i * 1.7) * amp
}

export const mockMetrics: AdMetric[] = Array.from({ length: 30 }, (_, i) => {
  const n = 29 - i
  return {
    id: `metric-${i}`,
    sync_id: 'sync-1',
    date: dateOffset(n),
    channel: 'google' as const,
    campaign: '브랜드 검색',
    ad_group: null,
    spend: Math.round(300_000 * wave(i, 0.15)),
    impressions: Math.round(20_000 * wave(i + 1, 0.2)),
    clicks: Math.round(900 * wave(i + 2, 0.2)),
    conversions: Math.round(30 * wave(i + 3, 0.3)),
    revenue: Math.round(1_500_000 * wave(i + 4, 0.25)),
  }
})

export function getMockDailyMetrics(days: 7 | 30): DailyMetric[] {
  return mockMetrics.slice(-days).map(m => ({
    date: m.date,
    spend: m.spend,
    clicks: m.clicks,
    conversions: m.conversions,
    revenue: m.revenue,
  }))
}

export const mockRules: DetectionRule[] = RULE_CODES.map(code => {
  const d = RULE_DEFAULTS[code]
  return {
    id: `rule-${code}`,
    rule_code: code,
    type: d.type,
    severity: d.severity,
    threshold: d.threshold,
    target_value: null,
    target_type: null,
    is_active: d.stage === 1,
    stage: d.stage,
  }
})

export const mockIssues: Issue[] = [
  {
    id: '1',
    rule_id: 'rule-R4',
    sync_id: 'sync-1',
    target: '브랜드 검색',
    target_date: dateOffset(1),
    detection_key: buildDetectionKey('R4', '브랜드 검색', dateOffset(1)),
    severity: 'critical',
    status: 'new',
    baseline_value: 32,
    actual_value: 0,
    weekend_note: null,
    memo: null,
    detected_at: '2026-10-30T09:05:00Z',
    notion_url: null,
  },
  {
    id: '2',
    rule_id: 'rule-R1',
    sync_id: 'sync-2',
    target: '파워링크 A그룹',
    target_date: dateOffset(2),
    detection_key: buildDetectionKey('R1', '파워링크 A그룹', dateOffset(2)),
    severity: 'high',
    status: 'in_progress',
    baseline_value: 250_000,
    actual_value: 410_000,
    weekend_note: null,
    memo: '입찰가 확인 중',
    detected_at: '2026-10-29T09:05:00Z',
    notion_url: 'https://www.notion.so/example',
  },
  {
    id: '3',
    rule_id: 'rule-R5',
    sync_id: 'sync-1',
    target: '일반 키워드',
    target_date: dateOffset(3),
    detection_key: buildDetectionKey('R5', '일반 키워드', dateOffset(3)),
    severity: 'medium',
    status: 'resolved',
    baseline_value: 12_000,
    actual_value: 16_500,
    weekend_note: WEEKEND_NOTE,
    memo: null,
    detected_at: '2026-10-28T09:05:00Z',
    notion_url: null,
  },
  {
    id: '4',
    rule_id: 'rule-R2',
    sync_id: 'sync-2',
    target: '파워링크 B그룹',
    target_date: dateOffset(4),
    detection_key: buildDetectionKey('R2', '파워링크 B그룹', dateOffset(4)),
    severity: 'high',
    status: 'new',
    baseline_value: 18_000,
    actual_value: 5_400,
    weekend_note: null,
    memo: null,
    detected_at: '2026-10-27T09:05:00Z',
    notion_url: null,
  },
  {
    id: '5',
    rule_id: 'rule-R6',
    sync_id: 'sync-1',
    target: '경쟁사 키워드',
    target_date: dateOffset(6),
    detection_key: buildDetectionKey('R6', '경쟁사 키워드', dateOffset(6)),
    severity: 'high',
    status: 'ignored',
    baseline_value: 400,
    actual_value: 1_300,
    weekend_note: null,
    memo: '캠페인 확대 집행으로 확인됨',
    detected_at: '2026-10-25T09:05:00Z',
    notion_url: null,
  },
  {
    id: '6',
    rule_id: 'rule-R3',
    sync_id: 'sync-1',
    target: '브랜드 검색',
    target_date: dateOffset(12),
    detection_key: buildDetectionKey('R3', '브랜드 검색', dateOffset(12)),
    severity: 'medium',
    status: 'new',
    baseline_value: 4.2,
    actual_value: 2.7,
    weekend_note: null,
    memo: null,
    detected_at: '2026-10-19T09:05:00Z',
    notion_url: null,
  },
]

export const MOCK_NOTION_CONNECTED = true

export function getMockRule(ruleId: string) {
  return mockRules.find(r => r.id === ruleId)
}

export function getIssueTitle(issue: Issue) {
  const rule = getMockRule(issue.rule_id)
  return `${rule?.type ?? '이상 감지'} · ${issue.target}`
}

export interface IssueFilters {
  status?: Issue['status']
  severity?: Issue['severity']
  /** 최근 N일 이내 감지 */
  days?: number
}

export function getMockIssues(filters: IssueFilters = {}) {
  const since = new Date(BASE_DATE)
  if (filters.days) since.setUTCDate(since.getUTCDate() - filters.days)
  return mockIssues
    .filter(i => !filters.status || i.status === filters.status)
    .filter(i => !filters.severity || i.severity === filters.severity)
    .filter(i => !filters.days || new Date(i.detected_at) >= since)
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at))
}

export function getMockIssue(id: string) {
  return mockIssues.find(i => i.id === id)
}

/** 대시보드 요약: 선택 기간 합계와 직전 동일 기간 대비 변화율 */
export function getMockSummary(days: 7 | 30) {
  const sum = (rows: AdMetric[]) =>
    rows.reduce(
      (a, m) => ({
        spend: a.spend + m.spend,
        clicks: a.clicks + m.clicks,
        conversions: a.conversions + m.conversions,
        revenue: a.revenue + m.revenue,
      }),
      { spend: 0, clicks: 0, conversions: 0, revenue: 0 }
    )
  const cur = sum(mockMetrics.slice(-days))
  const prevRows = mockMetrics.slice(-days * 2, -days)
  const prev = prevRows.length === days ? sum(prevRows) : null
  const rate = (a: number, b: number) => (b ? a / b - 1 : undefined)
  const roas = (t: typeof cur) => (t.spend ? t.revenue / t.spend : 0)
  return {
    ...cur,
    roas: roas(cur),
    change: prev && {
      spend: rate(cur.spend, prev.spend),
      clicks: rate(cur.clicks, prev.clicks),
      conversions: rate(cur.conversions, prev.conversions),
      roas: rate(roas(cur), roas(prev)),
    },
  }
}

export interface MockNotionDatabase {
  id: string
  title: string
  rowCount: number
}

/** 부모 페이지 하위 데이터베이스 (티켓 DB는 제외된 목록) */
export const mockNotionDatabases: MockNotionDatabase[] = [
  { id: 'a'.repeat(32), title: '구글 광고 성과 10월', rowCount: 120 },
  { id: 'b'.repeat(32), title: '네이버 광고 성과 10월', rowCount: 90 },
  { id: 'd'.repeat(32), title: '네이버 광고 성과 11월(샘플)', rowCount: 15 },
]

export interface MockValidationError {
  database: string
  row: number
  reason: string
}

export const mockValidationErrors: MockValidationError[] = [
  {
    database: '네이버 광고 성과 9월',
    row: 12,
    reason: "'노출' 값이 숫자가 아닙니다",
  },
  {
    database: '네이버 광고 성과 9월',
    row: 27,
    reason: "'날짜'가 YYYY-MM-DD 형식이 아닙니다",
  },
  {
    database: '네이버 광고 성과 9월',
    row: 40,
    reason: "필수 속성 '캠페인'이 비어 있습니다",
  },
]

export const mockDetectionSummary = { createdIssues: 3, excludedTargets: 5 }

export interface MockConnectionTest {
  tokenValid: boolean
  parentPageAccessible: boolean
  databaseCount: number
  ticketDbMatches: boolean
  ticketDbMessage?: string
}

export const mockConnectionTest: MockConnectionTest = {
  tokenValid: true,
  parentPageAccessible: true,
  databaseCount: 3,
  ticketDbMatches: false,
  ticketDbMessage: "티켓 데이터베이스에 '심각도' 속성이 없습니다",
}
