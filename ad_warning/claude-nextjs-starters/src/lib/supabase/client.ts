import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/**
 * 브라우저용 클라이언트 (anon key).
 * 모든 테이블에 RLS 정책이 없으므로 현재는 데이터 접근이 불가하다.
 * 데이터 접근은 서버(Repository/Server Action)를 통해서만 수행한다.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase 공개 환경 변수가 없습니다.')
  client = createClient(url, key)
  return client
}
