"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase-config";

// 관리자 화면(브라우저)에서만 쓰는 Supabase 연결. 공개 키(anon)라 노출돼도 되고, 쓰기 권한은 RLS 가 막는다.
let client: SupabaseClient | null | undefined;

export function browserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const cfg = supabaseConfig();
  client = cfg ? createClient(cfg.url, cfg.anonKey, { auth: { storageKey: "tf-admin-auth" } }) : null;
  return client;
}
