import { FakeNotion, IDS } from './fake-notion'

/** 통합 테스트가 공유하는 가짜 Notion 과 환경 변수 */
export let fake = new FakeNotion()

export const testEnv: {
  NOTION_TOKEN?: string
  NOTION_PARENT_PAGE_ID?: string
  NOTION_DATABASE_ID?: string
} = {}

export function resetHarness() {
  fake = new FakeNotion()
  testEnv.NOTION_TOKEN = 'secret_test'
  testEnv.NOTION_PARENT_PAGE_ID = IDS.parent
  testEnv.NOTION_DATABASE_ID = IDS.ticketDb
}
