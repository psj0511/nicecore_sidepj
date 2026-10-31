import { describe, expect, it } from 'vitest'
import type { DetectionRule, Issue } from '@/types'
import {
  buildTicketProperties,
  findSchemaProblems,
  ticketEvidence,
  ticketTitle,
} from './format'

const rule = {
  id: 'r1',
  rule_code: 'R1',
  type: '비용 급증',
} as DetectionRule

const issue: Issue = {
  id: 'i1',
  rule_id: 'r1',
  source_id: 's',
  target: '브랜드 검색',
  target_date: '2026-10-30',
  detection_key: 'k',
  severity: 'high',
  status: 'new',
  baseline_value: 250_000,
  actual_value: 410_000,
  weekend_note: null,
  memo: null,
  detected_at: '2026-10-31T09:05:00Z',
  notion_url: null,
}

describe('ticket format', () => {
  it('제목에 심각도·규칙 유형·대상을 담는다', () => {
    expect(ticketTitle(issue, rule)).toBe('[높음] 비용 급증 · 브랜드 검색')
    expect(ticketTitle(issue)).toBe('[높음] 이상 감지 · 브랜드 검색')
  })

  it('감지 근거에 기준값·실제값과 주말 메모를 포함한다', () => {
    const text = ticketEvidence({ ...issue, weekend_note: '주말 가능성' }, rule)
    expect(text).toContain('광고비: 기준 250,000원 → 실제 410,000원')
    expect(text).toContain('대상일: 2026-10-30')
    expect(text).toContain('주말 가능성')
  })

  it('티켓 DB 속성 6개를 모두 만든다', () => {
    const p = buildTicketProperties(issue, rule)
    expect(Object.keys(p).sort()).toEqual(
      ['감지 근거', '감지일', '규칙', '대상', '심각도', '제목'].sort()
    )
    expect(p.심각도.select.name).toBe('높음')
    expect(p.감지일.date.start).toBe('2026-10-31')
    expect(p.규칙.rich_text[0].text.content).toBe('R1 비용 급증')
  })

  it('2000자를 넘는 값은 잘라낸다', () => {
    const p = buildTicketProperties({ ...issue, target: 'x'.repeat(3000) })
    expect(p.대상.rich_text[0].text.content).toHaveLength(2000)
  })

  it('스키마 누락·타입 불일치를 찾아낸다', () => {
    const ok = {
      제목: { type: 'title' },
      규칙: { type: 'rich_text' },
      대상: { type: 'rich_text' },
      심각도: { type: 'select' },
      '감지 근거': { type: 'rich_text' },
      감지일: { type: 'date' },
    }
    expect(findSchemaProblems(ok)).toEqual([])
    const { 심각도: _omit, ...rest } = ok
    void _omit
    expect(findSchemaProblems(rest)).toEqual([
      "티켓 데이터베이스에 '심각도' 속성이 없습니다",
    ])
    expect(
      findSchemaProblems({ ...ok, 감지일: { type: 'rich_text' } })
    ).toEqual(["'감지일' 속성은 date 타입이어야 합니다 (현재 rich_text)"])
  })
})
