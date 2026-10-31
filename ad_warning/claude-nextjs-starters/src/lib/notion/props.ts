import 'server-only'

/** Notion 페이지 속성 읽기/쓰기 헬퍼 (앱 데이터 DB 전용) */
type Prop = Record<string, unknown> & { type: string }
export type Props = Record<string, Prop>

type RichItem = { plain_text?: string }
const join = (items: unknown) =>
  Array.isArray(items)
    ? (items as RichItem[]).map(i => i.plain_text ?? '').join('')
    : ''

export const read = {
  title: (p: Props, k: string) => join(p[k]?.title),
  text: (p: Props, k: string) => join(p[k]?.rich_text),
  textOrNull: (p: Props, k: string) => join(p[k]?.rich_text) || null,
  num: (p: Props, k: string) => (p[k]?.number as number | null) ?? 0,
  numOrNull: (p: Props, k: string) => (p[k]?.number as number | null) ?? null,
  select: (p: Props, k: string) =>
    ((p[k]?.select as { name?: string } | null)?.name ?? null) as string | null,
  date: (p: Props, k: string) =>
    ((p[k]?.date as { start?: string } | null)?.start ?? null) as string | null,
  checkbox: (p: Props, k: string) => Boolean(p[k]?.checkbox),
  url: (p: Props, k: string) => (p[k]?.url as string | null) ?? null,
}

const rich = (v: string) => [{ type: 'text' as const, text: { content: v } }]
// Notion rich_text 한 조각은 2000자 제한
const clip = (v: string) => v.slice(0, 2000)

export const write = {
  title: (v: string) => ({ title: rich(clip(v)) }),
  text: (v: string | null) => ({ rich_text: v ? rich(clip(v)) : [] }),
  num: (v: number | null) => ({ number: v }),
  select: (v: string | null) => ({ select: v ? { name: v } : null }),
  date: (v: string | null) => ({ date: v ? { start: v } : null }),
  checkbox: (v: boolean) => ({ checkbox: v }),
  url: (v: string | null) => ({ url: v }),
}
