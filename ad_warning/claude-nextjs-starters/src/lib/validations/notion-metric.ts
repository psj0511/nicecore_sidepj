import { z } from 'zod'
import { CHANNEL_VALUE_MAP } from '@/lib/notion/properties'

/** CSV 가져오기로 텍스트가 된 숫자("1,234", "₩1,000")도 허용 */
const numericField = z.preprocess(
  v => {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return v
    const cleaned = v.replace(/[,\s₩원]/g, '')
    return cleaned === '' ? undefined : Number(cleaned)
  },
  z
    .number({ error: '숫자 값이 아닙니다' })
    .finite('숫자 값이 아닙니다')
    .min(0, '0 이상이어야 합니다')
)

const dateField = z
  .string({ error: '날짜가 없습니다' })
  .trim()
  .transform(v => v.replace(/[./]/g, '-'))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{1,2}-\d{1,2}$/, 'YYYY-MM-DD 형식이 아닙니다')
      .transform(v => {
        const [y, m, d] = v.split('-').map(Number)
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      })
      .refine(v => !Number.isNaN(Date.parse(v)), '존재하지 않는 날짜입니다')
  )

const channelField = z
  .string({ error: '채널이 없습니다' })
  .trim()
  .transform(v => CHANNEL_VALUE_MAP[v.toLowerCase()])
  .pipe(
    z.enum(['google', 'naver'], { error: '채널은 구글/네이버만 가능합니다' })
  )

/** Notion 성과 데이터베이스 한 행 (변환 후 AdMetric 입력 형태) */
export const notionMetricRowSchema = z.object({
  date: dateField,
  channel: channelField,
  campaign: z
    .string({ error: '캠페인이 없습니다' })
    .trim()
    .min(1, '캠페인이 비어 있습니다'),
  adGroup: z
    .string()
    .trim()
    .optional()
    .transform(v => v || null),
  spend: numericField,
  impressions: numericField,
  clicks: numericField,
  conversions: numericField,
  revenue: numericField,
})

export type NotionMetricRow = z.output<typeof notionMetricRowSchema>
