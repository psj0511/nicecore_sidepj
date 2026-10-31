import { z } from 'zod'

/** Notion 페이지 ID: 하이픈 유무와 관계없이 32자리 hex (UUID 버전 비트는 검사하지 않음) */
export const notionPageIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i)
