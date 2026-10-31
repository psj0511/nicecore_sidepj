'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { deleteSync } from '@/lib/repositories/syncs'
import type { ActionResult } from './rules'

export async function deleteSyncAction(id: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { ok: false, error: '잘못된 요청입니다' }
  try {
    await deleteSync(parsed.data)
    revalidatePath('/sync')
    revalidatePath('/issues')
    revalidatePath('/')
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '삭제 실패' }
  }
}
