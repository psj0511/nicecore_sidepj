import { describe, expect, it } from 'vitest'
import { buildSeries, detect, evaluationTarget } from './engine'
import { makeRule, row } from './rules/test-utils'

const R1 = makeRule('R1')
const R4 = makeRule('R4')

describe('평가 단위', () => {
  it('구글은 캠페인, 네이버는 광고그룹이다', () => {
    expect(
      evaluationTarget(row('2026-11-04', { campaign: 'c', ad_group: 'g' }))
    ).toBe('c')
    expect(
      evaluationTarget(
        row('2026-11-04', { channel: 'naver', campaign: 'c', ad_group: 'g' })
      )
    ).toBe('g')
  })

  it('네이버 광고그룹이 비어 있으면 캠페인으로 대체한다', () => {
    expect(
      evaluationTarget(
        row('2026-11-04', { channel: 'naver', campaign: 'c', ad_group: null })
      )
    ).toBe('c')
  })

  it('원본 DB·채널·대상별로 시계열을 나누고 날짜순으로 정렬한다', () => {
    const series = buildSeries([
      row('2026-11-04', { campaign: 'a' }),
      row('2026-11-03', { campaign: 'a' }),
      row('2026-11-04', { campaign: 'b' }),
      row('2026-11-04', { campaign: 'a', source_id: 'src2' }),
    ])
    expect(series).toHaveLength(3)
    const a = series.find(
      s => s.sourceId === 'src1' && s.series.target === 'a'
    )!
    expect(a.series.metrics.map(m => m.date)).toEqual([
      '2026-11-03',
      '2026-11-04',
    ])
  })
})

describe('detect', () => {
  // 2026-11-04 는 수요일
  const spike = [
    row('2026-11-03', { spend: 200_000 }),
    row('2026-11-04', { spend: 400_000 }),
  ]

  it('활성 규칙 위반을 이슈 초안으로 만든다', () => {
    const run = detect(spike, [R1])
    expect(run.issues).toEqual([
      {
        rule_id: 'rule-R1',
        source_id: 'src1',
        target: 'c1',
        target_date: '2026-11-04',
        detection_key: 'R1|c1|2026-11-04',
        severity: 'high',
        baseline_value: 200_000,
        actual_value: 400_000,
        weekend_note: null,
      },
    ])
    expect(run).toMatchObject({ evaluated: 1, skipped: 0 })
  })

  it('비활성 규칙은 적용하지 않는다', () => {
    const run = detect(spike, [{ ...R1, is_active: false }])
    expect(run).toEqual({ issues: [], evaluated: 0, skipped: 0 })
  })

  it('2단계 규칙(R7·R8)은 활성이어도 평가·집계하지 않는다', () => {
    const run = detect(spike, [
      { ...makeRule('R7'), is_active: true },
      { ...makeRule('R8'), is_active: true },
    ])
    expect(run).toEqual({ issues: [], evaluated: 0, skipped: 0 })
  })

  it('임계값을 바꾸면 결과가 달라진다', () => {
    const strict = { ...R1, threshold: { costChangeRate: 1.5 } }
    expect(detect(spike, [strict]).issues).toHaveLength(0)
  })

  it('최소 규모 미달은 skipped 로 집계한다', () => {
    const small = [
      row('2026-11-03', { spend: 50_000 }),
      row('2026-11-04', { spend: 500_000 }),
    ]
    expect(detect(small, [R1])).toMatchObject({
      issues: [],
      evaluated: 0,
      skipped: 1,
    })
  })

  it('기본은 시계열별 가장 최근 날짜만 평가한다', () => {
    const run = detect(
      [
        row('2026-11-02', { spend: 100_000 }),
        row('2026-11-03', { spend: 200_000 }),
        row('2026-11-04', { spend: 200_000 }),
      ],
      [R1]
    )
    expect(run.evaluated).toBe(1)
    expect(run.issues).toHaveLength(0)
  })

  it('targetDates 로 여러 날을 평가한다', () => {
    const run = detect(
      [
        row('2026-11-02', { spend: 100_000 }),
        row('2026-11-03', { spend: 200_000 }),
        row('2026-11-04', { spend: 200_000 }),
      ],
      [R1],
      { targetDates: ['2026-11-03', '2026-11-04'] }
    )
    expect(run.issues.map(i => i.detection_key)).toEqual(['R1|c1|2026-11-03'])
  })

  it('주말·공휴일이면 R4 심각도를 낮추고 안내를 남긴다', () => {
    // 2026-11-01 은 일요일
    const run = detect(
      [
        row('2026-10-31', { conversions: 5 }),
        row('2026-11-01', { conversions: 0 }),
      ],
      [R4]
    )
    expect(run.issues[0]).toMatchObject({
      severity: 'high',
      weekend_note: '주말·공휴일 가능성',
    })
  })

  it('같은 입력을 반복해도 감지 키가 같아 중복 제거할 수 있다', () => {
    const a = detect(spike, [R1]).issues.map(i => i.detection_key)
    const b = detect(spike, [R1]).issues.map(i => i.detection_key)
    expect(a).toEqual(b)
  })

  it('원본 DB가 다르면 시계열을 합치지 않는다', () => {
    const run = detect(
      [
        row('2026-11-03', { spend: 200_000, source_id: 'a' }),
        row('2026-11-04', { spend: 400_000, source_id: 'b' }),
      ],
      [R1]
    )
    // 각각 전일 데이터가 없어 평가 제외
    expect(run).toMatchObject({ issues: [], skipped: 2 })
  })

  it('같은 날짜의 행은 대상 단위로 합산해서 평가한다', () => {
    const run = detect(
      [
        row('2026-11-03', { channel: 'naver', ad_group: 'g', spend: 100_000 }),
        row('2026-11-03', { channel: 'naver', ad_group: 'g', spend: 100_000 }),
        row('2026-11-04', { channel: 'naver', ad_group: 'g', spend: 150_000 }),
        row('2026-11-04', { channel: 'naver', ad_group: 'g', spend: 150_000 }),
      ],
      [R1]
    )
    expect(run.issues[0]).toMatchObject({
      target: 'g',
      baseline_value: 200_000,
      actual_value: 300_000,
    })
  })
})
