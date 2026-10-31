import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIErrorCode } from '@notionhq/client'
import { IDS, metricRow, notionError, rich } from '@/test/fake-notion'
import { fake, resetHarness, testEnv } from '@/test/harness'

vi.mock('@/lib/env', async () => ({
  env: (await import('@/test/harness')).testEnv,
}))
vi.mock('next/cache', () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
}))
vi.mock('@/lib/notion/client', async () => {
  const h = await import('@/test/harness')
  return {
    getNotion: () => h.fake.client,
    getParentPageId: () => h.testEnv.NOTION_PARENT_PAGE_ID,
    queryAll: async (params: object) =>
      (await h.fake.client.dataSources.query(params)).results,
  }
})
vi.mock('@/lib/notion/store', async importActual => ({
  ...(await importActual<typeof import('@/lib/notion/store')>()),
  getStore: async () => ({ rules: IDS.rulesDs, issues: IDS.issuesDs }),
}))

import {
  createTicketAction,
  saveIssueMemoAction,
  updateIssueStatusAction,
} from '@/lib/actions/issues'
import { dailySeries, summarize } from '@/lib/dashboard/summary'
import { runDetection } from '@/lib/detection/service'
import {
  listMetrics,
  listSourceDatabases,
  readAllSources,
} from '@/lib/notion/sources'
import { getIssue, listIssues } from '@/lib/repositories/issues'
import { testNotionConnection } from '@/lib/tickets/service'

const ALL = { from: '0000-01-01', to: '9999-12-31' }

/** 2026-10-24~30 은 광고비 200,000 (평일 위주), 마지막 날은 값을 바꿀 수 있다 */
function week(
  last: Parameters<typeof metricRow>[1] = {},
  campaign = '브랜드 검색'
) {
  const days = ['24', '25', '26', '27', '28', '29']
  return [
    ...days.map(d => metricRow(`2026-10-${d}`, { campaign })),
    metricRow('2026-10-30', { campaign, ...last }),
  ]
}

beforeEach(() => {
  resetHarness()
})

describe('핵심 플로우: 조회 → 감지 → 이슈 → 상세 → 상태 → 티켓', () => {
  it('비용 급증을 감지해 이슈를 만들고, 상태 변경·메모·티켓 생성까지 이어진다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))

    const summary = await runDetection()
    expect(summary).toMatchObject({ created: 1, detected: 1 })

    const [issue] = await listIssues()
    expect(issue).toMatchObject({
      target: '브랜드 검색',
      severity: 'high',
      status: 'new',
      baseline_value: 200_000,
      actual_value: 500_000,
      notion_url: null,
    })
    expect(await getIssue(issue!.id)).toMatchObject({ id: issue!.id })

    expect(await updateIssueStatusAction(issue!.id, 'in_progress')).toEqual({
      ok: true,
      data: undefined,
    })
    expect((await saveIssueMemoAction(issue!.id, '입찰가 확인')).ok).toBe(true)
    expect(await listIssues({ status: 'in_progress' })).toHaveLength(1)
    expect(await listIssues({ status: 'new' })).toHaveLength(0)

    const res = await createTicketAction(issue!.id)
    expect(res.ok).toBe(true)
    const tickets = fake.pagesIn(IDS.ticketDs)
    expect(tickets).toHaveLength(1)
    const t = tickets[0]!.properties
    expect(t['제목'].title[0].plain_text).toBe('[높음] 비용 급증 · 브랜드 검색')
    expect(t['심각도'].select.name).toBe('높음')
    expect(t['감지 근거'].rich_text[0].plain_text).toContain('500,000원')
    const saved = await getIssue(issue!.id)
    expect(saved?.notion_url).toBe(res.ok ? res.data.url : '')
    expect(saved).toMatchObject({ status: 'in_progress', memo: '입찰가 확인' })
  })

  it('이미 티켓이 있는 이슈는 다시 만들지 않는다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))
    await runDetection()
    const [issue] = await listIssues()
    const first = await createTicketAction(issue!.id)
    const second = await createTicketAction(issue!.id)
    expect(second).toEqual(first)
    expect(fake.pagesIn(IDS.ticketDs)).toHaveLength(1)
  })

  it('같은 이슈의 동시 생성 요청은 티켓 하나만 만든다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))
    await runDetection()
    const [issue] = await listIssues()
    const [a, b, c] = await Promise.all([
      createTicketAction(issue!.id),
      createTicketAction(issue!.id),
      createTicketAction(issue!.id),
    ])
    expect(a.ok && b.ok && c.ok).toBe(true)
    expect(fake.pagesIn(IDS.ticketDs)).toHaveLength(1)
  })

  it('감지를 반복해도 같은 감지 키의 이슈는 하나다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))
    await runDetection()
    const again = await runDetection()
    expect(again).toMatchObject({ created: 0, detected: 1 })
    expect(await listIssues()).toHaveLength(1)
  })
})

describe('엣지 케이스', () => {
  it('데이터가 7일 미만이면 전일과, 7일 이상이면 직전 7일 평균과 비교한다', async () => {
    // 2일치: 전일 200,000 → 오늘 400,000 (+100%)
    fake.addSource('짧은 이력', [
      metricRow('2026-10-29'),
      metricRow('2026-10-30', { spend: 400_000 }),
    ])
    // 8일치: 평균 200,000 이지만 전일(10-29)만 높음 → 평균 기준이면 오늘 290,000 은 +45%(미달)
    fake.addSource('긴 이력', [
      ...['22', '23', '24', '25', '26', '27', '28'].map(d =>
        metricRow(`2026-10-${d}`, { campaign: '긴 캠페인', spend: 200_000 })
      ),
      metricRow('2026-10-29', { campaign: '긴 캠페인', spend: 200_000 }),
      metricRow('2026-10-30', { campaign: '긴 캠페인', spend: 290_000 }),
    ])
    await runDetection()
    const issues = await listIssues()
    expect(issues.map(i => i.target)).toEqual(['브랜드 검색'])
    expect(issues[0]!.baseline_value).toBe(200_000)
  })

  it('최소 규모(광고비 10만 원) 미달은 평가에서 제외한다', async () => {
    fake.addSource('소액', [
      metricRow('2026-10-29', { spend: 20_000 }),
      metricRow('2026-10-30', { spend: 90_000 }),
    ])
    const s = await runDetection()
    expect(s.created).toBe(0)
    expect(s.skipped).toBeGreaterThan(0)
  })

  it('주말 대상일의 전환 0 은 심각도를 낮추고 안내 문구를 남긴다', async () => {
    // 2026-10-31 은 토요일
    fake.addSource('주말', [
      metricRow('2026-10-30', { conversions: 10 }),
      metricRow('2026-10-31', { conversions: 0 }),
    ])
    await runDetection()
    const [issue] = await listIssues()
    expect(issue).toMatchObject({ severity: 'high' })
    expect(issue!.weekend_note).toBeTruthy()
  })

  it('평일 전환 0 은 긴급이다', async () => {
    fake.addSource('평일', [
      metricRow('2026-10-29', { conversions: 10 }),
      metricRow('2026-10-30', { conversions: 0 }),
    ])
    await runDetection()
    const [issue] = await listIssues()
    expect(issue).toMatchObject({ severity: 'critical', weekend_note: null })
  })

  it('티켓 DB·앱 데이터 DB 는 성과 데이터로 읽지 않는다', async () => {
    fake.addSource('구글 성과', week())
    fake.addDatabase(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '[AD] 이슈',
      IDS.issuesDs
    )
    // 티켓 DB 에 성과 데이터처럼 보이는 행이 있어도 읽지 않는다
    await fake.client.pages.create({
      parent: { type: 'data_source_id', data_source_id: IDS.ticketDs },
      properties: {
        제목: { title: rich('티켓') },
        날짜: { date: { start: '2026-10-30' } },
      },
    })
    const dbs = await listSourceDatabases()
    expect(dbs.map(d => d.title)).toEqual(['구글 성과'])
    const metrics = await listMetrics(ALL)
    expect(metrics).toHaveLength(7)
  })

  it('Notion 데이터를 고친 뒤 다시 읽으면 감지 결과에 반영된다', async () => {
    const src = fake.addSource('구글 성과', week({ spend: 500_000 }))
    expect((await runDetection()).detected).toBe(1)
    const lastId = src.rowIds[6]!
    await fake.client.pages.update({
      page_id: lastId,
      properties: { 광고비: { number: 210_000 } },
    })
    expect((await runDetection()).detected).toBe(0)
    expect((await listMetrics(ALL)).at(-1)?.spend).toBe(210_000)
  })

  it('CSV 로 가져온 텍스트 숫자("1,234")와 날짜 형식도 읽는다', async () => {
    fake.addSource('CSV', [
      metricRow('2026-10-30', { spend: '1,234,000', clicks: '1,200' }),
    ])
    const [m] = await listMetrics(ALL)
    expect(m).toMatchObject({ spend: 1_234_000, clicks: 1200 })
  })
})

describe('에러 핸들링', () => {
  it('형식이 잘못된 행은 제외하고 오류로 보고하며 나머지는 계속 감지한다', async () => {
    fake.addSource('섞인 데이터', [
      ...week({ spend: 500_000 }),
      metricRow('2026-10-30', { campaign: '오류', spend: '천원' }),
      metricRow('잘못된날짜', { campaign: '오류2' }),
    ])
    const [snap] = await readAllSources()
    expect(snap!.errors).toHaveLength(2)
    expect(snap!.metrics).toHaveLength(7)
    expect((await runDetection()).created).toBe(1)
  })

  it('필수 속성이 없는 DB 는 한 건의 오류로 보고하고 다른 DB 는 계속 읽는다', async () => {
    fake.addSource('속성 누락', [metricRow('2026-10-30', { omit: ['광고비'] })])
    fake.addSource('정상', week())
    const snaps = await readAllSources()
    const bad = snaps.find(s => s.database.title === '속성 누락')!
    expect(bad.metrics).toHaveLength(0)
    expect(bad.errors).toHaveLength(1)
    expect(bad.errors[0]!.reason).toContain('광고비')
    expect(await listMetrics(ALL)).toHaveLength(7)
  })

  it('성과 DB 하나의 조회가 실패해도 나머지는 표시한다', async () => {
    const bad = fake.addSource('장애 DB', week())
    fake.addSource('정상', week({}, '다른 캠페인'))
    fake.fail(
      'dataSources.query:' + bad.dsId,
      notionError(APIErrorCode.InternalServerError, 500),
      true
    )
    const snaps = await readAllSources()
    expect(
      snaps.find(s => s.database.title === '장애 DB')!.errors[0]!.row
    ).toBe(0)
    expect(await listMetrics(ALL)).toHaveLength(7)
  })

  it('Notion 전체 장애면 감지는 실패하지만 다음 호출은 정상 동작한다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))
    fake.fail(
      'blocks.children.list',
      notionError(APIErrorCode.ServiceUnavailable, 503)
    )
    await expect(runDetection()).rejects.toThrow()
    expect((await runDetection()).created).toBe(1)
  })

  it('성과 데이터가 없으면 감지·집계 모두 빈 결과다', async () => {
    const s = await runDetection()
    expect(s).toMatchObject({ created: 0, detected: 0, evaluated: 0 })
    const metrics = await listMetrics(ALL)
    expect(metrics).toEqual([])
    expect(summarize(metrics, 7).change).toBeNull()
    expect(dailySeries(metrics, 7)).toEqual([])
  })

  it('티켓 DB 속성이 맞지 않으면 티켓을 만들지 않고 이유를 알린다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))
    await runDetection()
    const [issue] = await listIssues()
    delete fake.ticketSchema['심각도']
    const res = await createTicketAction(issue!.id)
    expect(res).toMatchObject({ ok: false })
    expect(!res.ok && res.error).toContain("'심각도' 속성이 없습니다")
    expect(fake.pagesIn(IDS.ticketDs)).toHaveLength(0)
    expect((await getIssue(issue!.id))?.notion_url).toBeNull()
  })

  it.each([
    [APIErrorCode.Unauthorized, 401, '토큰'],
    [APIErrorCode.RestrictedResource, 403, '권한'],
    [APIErrorCode.ObjectNotFound, 404, '찾을 수 없습니다'],
  ])(
    '티켓 생성 중 %s 오류는 한국어로 안내하고 이슈를 바꾸지 않는다',
    async (code, status, text) => {
      fake.addSource('구글 성과', week({ spend: 500_000 }))
      await runDetection()
      const [issue] = await listIssues()
      fake.fail('pages.create', notionError(code, status))
      const res = await createTicketAction(issue!.id)
      expect(!res.ok && res.error).toContain(text)
      expect((await getIssue(issue!.id))?.notion_url).toBeNull()
      // 오류 뒤 재시도하면 성공한다 (실패가 상태를 망가뜨리지 않음)
      expect((await createTicketAction(issue!.id)).ok).toBe(true)
    }
  )

  it('Notion 미연동이면 티켓을 만들지 않는다', async () => {
    fake.addSource('구글 성과', week({ spend: 500_000 }))
    await runDetection()
    const [issue] = await listIssues()
    testEnv.NOTION_DATABASE_ID = undefined
    const res = await createTicketAction(issue!.id)
    expect(!res.ok && res.error).toContain('연동')
    expect(fake.pagesIn(IDS.ticketDs)).toHaveLength(0)
  })

  it('이슈 DB 가 아닌 페이지 ID 로는 상태·티켓을 바꿀 수 없다', async () => {
    const src = fake.addSource('구글 성과', week())
    const perfPage = src.rowIds[0]!
    const a = await updateIssueStatusAction(perfPage, 'resolved')
    const b = await createTicketAction(perfPage)
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    expect(
      await updateIssueStatusAction('not-an-id', 'resolved')
    ).toMatchObject({ ok: false })
    expect(fake.pagesIn(IDS.ticketDs)).toHaveLength(0)
  })

  it('연결 확인: 정상이면 모두 통과하고, 속성이 틀리면 실패 이유를 보여준다', async () => {
    fake.addSource('구글 성과', week())
    const ok = await testNotionConnection()
    expect(ok.filter(c => !c.ok)).toEqual([])
    delete fake.ticketSchema['감지일']
    const bad = await testNotionConnection()
    expect(bad.find(c => !c.ok)?.note).toContain('감지일')
  })

  it('연결 확인: 부모 페이지를 못 찾으면 부모 페이지 기준으로 안내한다', async () => {
    fake.pages.delete(IDS.parent)
    const failed = (await testNotionConnection()).find(c => !c.ok)
    expect(failed?.label).toBe('부모 페이지 접근')
    expect(failed?.note).toContain('NOTION_PARENT_PAGE_ID')
    expect(failed?.note).not.toContain('티켓')
  })

  it('연결 확인: 토큰이 틀리면 첫 단계에서 멈춘다', async () => {
    fake.fail('users.me', notionError(APIErrorCode.Unauthorized, 401))
    const checks = await testNotionConnection()
    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({ label: '토큰 유효성', ok: false })
  })

  it('읽기 범위: 최신 날짜 기준 N일 밖의 오래된 행은 서버에서 걸러 읽지 않는다', async () => {
    fake.addSource('구글 성과', [
      metricRow('2026-01-05'),
      metricRow('2026-02-01'),
      ...week(),
    ])
    expect(await listMetrics(ALL)).toHaveLength(9)
    const windowed = await listMetrics(ALL, { windowDays: 90 })
    expect(windowed).toHaveLength(7)
    expect(windowed[0]?.date).toBe('2026-10-24')
  })
})
