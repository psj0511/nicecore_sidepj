import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let client: SupabaseClient | undefined

/** 서버 전용 클라이언트 (service_role). Repository/Server Action에서만 사용 */
export function getSupabaseServer(): SupabaseClient {
  if (client) return client
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase 환경 변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 .env.local에 설정하세요.'
    )
  }
  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}

export function isSupabaseConfigured() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
}
