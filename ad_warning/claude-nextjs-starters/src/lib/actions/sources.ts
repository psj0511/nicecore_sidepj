'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { SOURCE_CACHE_TAG } from '@/lib/notion/sources'

/** 캐시를 비워 다음 조회 때 Notion에서 즉시 다시 읽는다 */
export async function refreshSourcesAction() {
  revalidateTag(SOURCE_CACHE_TAG)
  revalidatePath('/sources')
  revalidatePath('/')
}
