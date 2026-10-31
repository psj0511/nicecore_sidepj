'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { notionPageIdSchema } from '@/lib/validations/notion-id'
import { updateIssue } from '@/lib/repositories/issues'
import { ISSUE_STATUSES } from '@/types'
import type { ActionResult } from './rules'

const idSchema = notionPageIdSchema

export async function updateIssueStatusAction(
  id: string,
  status: string
): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id)
  const parsedStatus = z.enum(ISSUE_STATUSES).safeParse(status)
  if (!parsedId.success || !parsedStatus.success)
    return { ok: false, error: '잘못된 요청입니다' }
  try {
    await updateIssue(parsedId.data, { status: parsedStatus.data })
    revalidatePath('/issues')
    revalidatePath(`/issues/${id}`)
    revalidatePath('/')
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장 실패' }
  }
}

export async function saveIssueMemoAction(
  id: string,
  memo: string
): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id)
  const parsedMemo = z.string().max(2000).safeParse(memo)
  if (!parsedId.success || !parsedMemo.success)
    return { ok: false, error: '잘못된 요청입니다' }
  try {
    await updateIssue(parsedId.data, { memo: parsedMemo.data || null })
    revalidatePath(`/issues/${id}`)
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장 실패' }
  }
}
