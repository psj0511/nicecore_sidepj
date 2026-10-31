'use server'

import {
  testNotionConnection,
  type ConnectionCheck,
} from '@/lib/tickets/service'
import type { ActionResult } from './rules'

/** 환경 변수로 설정된 Notion 연동 정보를 실제로 확인한다 */
export async function testNotionConnectionAction(): Promise<
  ActionResult<ConnectionCheck[]>
> {
  try {
    return { ok: true, data: await testNotionConnection() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '확인 실패' }
  }
}
