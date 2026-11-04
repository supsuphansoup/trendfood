"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { FoodsPanel } from "@/components/admin/foods-panel";
import { LinksPanel } from "@/components/admin/links-panel";
import { LoginForm } from "@/components/admin/login-form";
import { PublishBar } from "@/components/admin/publish-bar";
import { QueuePanel } from "@/components/admin/queue-panel";
import { Button } from "@/components/ui/button";
import { browserSupabase } from "@/lib/supabase-browser";
import { supabaseConfig } from "@/lib/supabase-config";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "no-config" }
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "not-admin"; email: string }
  | { kind: "admin"; email: string };

const tabs = [
  { id: "foods", label: "게시 관리" },
  { id: "links", label: "재료 링크" },
  { id: "queue", label: "후보 큐" },
] as const;
type TabId = (typeof tabs)[number]["id"];

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>(() => (supabaseConfig() ? { kind: "loading" } : { kind: "no-config" }));

  const check = useCallback(async (db: SupabaseClient) => {
    const { data } = await db.auth.getSession();
    const user = data.session?.user;
    if (!user) return setPhase({ kind: "signed-out" });
    const { data: rows } = await db.from("admins").select("user_id").eq("user_id", user.id);
    const email = user.email ?? "";
    setPhase(rows && rows.length > 0 ? { kind: "admin", email } : { kind: "not-admin", email });
  }, []);

  useEffect(() => {
    const db = browserSupabase();
    if (!db) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 세션 확인은 비동기라 첫 렌더 뒤 한 번만 바뀐다
    void check(db);
    // 다른 탭에서 로그아웃하거나 세션이 끝나면 로그인 화면으로
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      if (!session) setPhase({ kind: "signed-out" });
    });
    return () => data.subscription.unsubscribe();
  }, [check]);

  const db = browserSupabase();

  if (phase.kind === "no-config") {
    return (
      <Centered title="Supabase 연결 전이에요">
        <p className="text-base leading-relaxed text-body">
          관리자 화면은 Supabase 로그인으로 동작해요. <code>web/.env.local</code> 에{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> 과 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 를 넣고 다시 빌드하세요. 자세한
          순서는 저장소 맨 위 <code>ONBOARDING.md</code> 에 있어요.
        </p>
      </Centered>
    );
  }
  if (phase.kind === "loading" || !db) {
    return (
      <Centered title="관리자 로그인">
        <p className="text-base text-muted-foreground" aria-busy>
          확인하는 중이에요…
        </p>
      </Centered>
    );
  }
  if (phase.kind === "signed-out") {
    return (
      <Centered title="관리자 로그인">
        <LoginForm db={db} onSignedIn={() => check(db)} />
      </Centered>
    );
  }
  if (phase.kind === "not-admin") {
    return (
      <Centered title="관리자 권한이 없어요">
        <p className="text-base leading-relaxed text-body">
          {phase.email} 계정은 운영자로 등록되지 않았어요. 운영자에게 등록을 부탁하세요.
        </p>
        <Button variant="outline" onClick={() => db.auth.signOut()}>
          로그아웃
        </Button>
      </Centered>
    );
  }
  return <AdminShell db={db} email={phase.email} />;
}

function AdminShell({ db, email }: { db: SupabaseClient; email: string }) {
  const [tab, setTab] = useState<TabId>("foods");
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-3 px-5 py-3">
          <h1 className="text-xl font-black tracking-[-0.03em]">트렌드푸드 관리</h1>
          <span className="text-sm text-muted-foreground">{email}</span>
          <Button variant="outline" className="ml-auto" onClick={() => db.auth.signOut()}>
            로그아웃
          </Button>
        </div>
        <nav aria-label="관리 메뉴" className="mx-auto flex max-w-[1100px] gap-1 px-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-11 border-b-[3px] px-3 text-base font-bold",
                tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-5 py-6">
        <PublishBar db={db} />
        {tab === "foods" && <FoodsPanel db={db} />}
        {tab === "links" && <LinksPanel db={db} />}
        {tab === "queue" && <QueuePanel db={db} />}
      </main>
    </>
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-5 px-5 py-16">
      <h1 className="text-2xl font-black tracking-[-0.03em]">{title}</h1>
      {children}
    </main>
  );
}
