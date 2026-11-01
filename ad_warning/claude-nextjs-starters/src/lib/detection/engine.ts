import type { AdMetric, DetectionRule, Issue, TargetSeries } from '@/types'
import { isWeekendOrHoliday } from './calendar'
import { EVALUATORS } from './rules'

/** insertIssuesIgnoreDuplicates 에 그대로 넘길 수 있는 이슈 초안 */
export type IssueDraft = Omit<
  Issue,
  'id' | 'detected_at' | 'status' | 'memo' | 'notion_url'
>

export interface SourceSeries {
  /** 가장 최근 날짜 행이 속한 원본 DB. 이슈에는 대상일 행의 DB를 기록한다 */
  sourceId: string
  series: TargetSeries
}

export interface DetectionRun {
  issues: IssueDraft[]
  /** 규칙을 실제로 평가한 횟수 */
  evaluated: number
  /** 최소 규모·데이터 부족 등으로 평가 제외된 횟수 */
  skipped: number
}

/** 평가 단위: 구글 = 캠페인, 네이버 = 광고그룹(없으면 캠페인) */
export function evaluationTarget(m: AdMetric): string {
  return m.channel === 'naver' ? m.ad_group || m.campaign : m.campaign
}

/**
 * 성과 행을 (채널, 평가 대상)별 시계열로 묶는다.
 * 보고서가 날짜마다 별도 DB로 나뉘어 있어도 같은 대상의 날짜들을 이어서 비교할 수 있도록
 * 원본 DB는 키에 넣지 않는다.
 */
export function buildSeries(metrics: AdMetric[]): SourceSeries[] {
  const map = new Map<string, SourceSeries>()
  for (const m of metrics) {
    const target = evaluationTarget(m)
    const key = `${m.channel}|${target}`
    let entry = map.get(key)
    if (!entry) {
      entry = {
        sourceId: m.source_id,
        series: { channel: m.channel, target, metrics: [] },
      }
      map.set(key, entry)
    }
    entry.series.metrics.push(m)
  }
  for (const e of map.values()) {
    e.series.metrics.sort((a, b) => a.date.localeCompare(b.date))
    e.sourceId = e.series.metrics[e.series.metrics.length - 1]!.source_id
  }
  return [...map.values()]
}

export interface DetectOptions {
  /** 평가할 대상일. 생략하면 시계열별 가장 최근 날짜 */
  targetDates?: string[]
}

/**
 * 활성 1단계 규칙을 모든 시계열에 적용해 이슈 초안을 만든다.
 * 순수 함수 — 저장과 중복 제거(감지 키)는 호출 쪽에서 한다.
 */
export function detect(
  metrics: AdMetric[],
  rules: DetectionRule[],
  options: DetectOptions = {}
): DetectionRun {
  const activeRules = rules.filter(r => r.is_active && r.stage === 1)
  const run: DetectionRun = { issues: [], evaluated: 0, skipped: 0 }

  for (const { series } of buildSeries(metrics)) {
    const latest = series.metrics[series.metrics.length - 1]?.date
    const dates =
      options.targetDates?.filter(d =>
        series.metrics.some(m => m.date === d)
      ) ?? (latest ? [latest] : [])

    for (const targetDate of dates) {
      // 이슈는 대상일 행이 있는 DB에 연결한다
      const sourceId = series.metrics.find(m => m.date === targetDate)!
        .source_id
      for (const rule of activeRules) {
        const result = EVALUATORS[rule.rule_code]({
          sourceId,
          series,
          targetDate,
          rule,
          isWeekendOrHoliday: isWeekendOrHoliday(targetDate),
        })
        if (result.skipped) {
          run.skipped++
          continue
        }
        run.evaluated++
        if (!result.triggered) continue
        run.issues.push({
          rule_id: rule.id,
          source_id: sourceId,
          target: series.target,
          target_date: targetDate,
          detection_key: result.detectionKey!,
          severity: result.severity!,
          baseline_value: result.baselineValue!,
          actual_value: result.actualValue!,
          weekend_note: result.weekendNote ?? null,
        })
      }
    }
  }
  return run
}
