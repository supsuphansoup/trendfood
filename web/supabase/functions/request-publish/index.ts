// Supabase Edge Function: 관리자 화면의 '사이트에 반영' 버튼 → GitHub Actions 배포 워크플로 실행.
// 배포: supabase functions deploy request-publish
// 비밀값: supabase secrets set GITHUB_TOKEN=<저장소 하나만, Contents 읽기·쓰기 권한의 fine-grained 토큰> GITHUB_REPO=supsuphansoup/trendfood
// (SUPABASE_URL·SUPABASE_ANON_KEY 는 Supabase 가 자동으로 넣어 준다)
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const COOLDOWN_MINUTES = 5;

const reply = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, "POST 만 받아요.");

  // 로그인한 사람의 권한으로 DB 를 본다 (RLS 그대로 적용)
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminError } = await db.rpc("is_admin");
  if (adminError || isAdmin !== true) return reply(403, "운영자만 반영할 수 있어요.");

  const since = new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString();
  const { count } = await db.from("publish_requests").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) > 0) return reply(429, `방금 반영을 요청했어요. ${COOLDOWN_MINUTES}분 뒤에 다시 눌러 주세요.`);

  const { data: user } = await db.auth.getUser();
  await db.from("publish_requests").insert({ requested_by: user.user?.id ?? null });

  const res = await fetch(`https://api.github.com/repos/${Deno.env.get("GITHUB_REPO")}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "trendfood-publish",
    },
    body: JSON.stringify({ event_type: "publish" }),
  });
  if (!res.ok) return reply(502, `GitHub 에 요청하지 못했어요 (${res.status}). 토큰 설정을 확인해 주세요.`);
  return reply(200, "반영을 요청했어요. 3~5분 뒤 사이트에 보여요.");
});
