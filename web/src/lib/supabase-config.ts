// Supabase 접속 정보. 공개 키(anon)만 쓴다 — 보호는 RLS 가 맡는다 (supabase/migrations/0001_init.sql).
// 값은 web/.env.local (로컬) 또는 GitHub Actions 비밀값(배포)에 넣는다. 없으면 예시 데이터로 동작한다.
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
