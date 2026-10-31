import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VERCEL_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  /** 서버 전용. 절대 NEXT_PUBLIC_ 접두사를 붙이지 않는다 */
  NOTION_TOKEN: z.string().min(1).optional(),
  /** 앱 데이터 DB(규칙·이슈)와 성과 DB를 두는 부모 페이지 */
  NOTION_PARENT_PAGE_ID: z.string().min(1).optional(),
  /** 이슈 티켓을 생성할 데이터베이스 */
  NOTION_DATABASE_ID: z.string().min(1).optional(),
})

/** 빈 문자열(`KEY=`)은 미설정으로 취급한다 */
const blankToUndefined = (v: string | undefined) => (v?.trim() ? v : undefined)

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NOTION_TOKEN: blankToUndefined(process.env.NOTION_TOKEN),
  NOTION_PARENT_PAGE_ID: blankToUndefined(process.env.NOTION_PARENT_PAGE_ID),
  NOTION_DATABASE_ID: blankToUndefined(process.env.NOTION_DATABASE_ID),
})

export type Env = z.infer<typeof envSchema>
