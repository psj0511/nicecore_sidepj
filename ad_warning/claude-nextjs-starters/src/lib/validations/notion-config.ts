import { z } from 'zod'

/** Notion ID: 하이픈 유무와 URL 입력을 모두 허용하고 32자리 hex로 정규화 */
const notionId = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label}을(를) 입력하세요`)
    .transform(v => {
      const m = v.replace(/-/g, '').match(/[0-9a-f]{32}/i)
      return m ? m[0].toLowerCase() : v
    })
    .refine(v => /^[0-9a-f]{32}$/.test(v), `${label} 형식이 올바르지 않습니다`)

export const notionConfigFormSchema = z.object({
  token: z.string().trim().min(1, 'Notion 토큰을 입력하세요'),
  parentPageId: notionId('부모 페이지 ID'),
  databaseId: notionId('티켓 데이터베이스 ID'),
})

export type NotionConfigFormValues = z.input<typeof notionConfigFormSchema>
