import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Run = { started_at: string; finished_at: string | null; ok: boolean | null; summary: Record<string, unknown> };

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** '사이트에 반영' 버튼 + 마지막 자동 수집 결과 */
export function PublishBar({ db }: { db: SupabaseClient }) {
  const [run, setRun] = useState<Run | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    db.from("pipeline_runs")
      .select("started_at, finished_at, ok, summary")
      .order("started_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setRun((data?.[0] as Run | undefined) ?? null));
  }, [db]);

  async function publish() {
    setPending(true);
    setMessage("");
    const { data, error } = await db.functions.invoke<{ message?: string }>("request-publish", { method: "POST" });
    setPending(false);
    if (error) {
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      return setMessage(body?.message ?? "반영 요청에 실패했어요. 잠시 뒤 다시 눌러 주세요.");
    }
    setMessage(data?.message ?? "반영을 요청했어요. 3~5분 뒤 사이트에 보여요.");
  }

  const runText = !run
    ? "자동 수집 기록이 아직 없어요."
    : run.ok === false
      ? `자동 수집 실패 (${when(run.started_at)}): ${String(run.summary?.error ?? "원인 미상")}`
      : run.finished_at
        ? `마지막 자동 수집 ${when(run.started_at)} · 새 후보 ${Number(run.summary?.inserted ?? 0)}개`
        : `자동 수집 진행 중 (${when(run.started_at)} 시작)`;

  return (
    <section aria-label="사이트 반영" className="flex flex-wrap items-center gap-3 rounded-2xl border bg-background p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-base font-bold">고친 내용은 &lsquo;사이트에 반영&rsquo;을 눌러야 방문자에게 보여요.</p>
        <p className={run?.ok === false ? "text-sm font-bold text-destructive" : "text-sm text-muted-foreground"}>
          {runText}
        </p>
      </div>
      <Button variant="cta" onClick={publish} disabled={pending}>
        {pending ? "요청 중…" : "사이트에 반영"}
      </Button>
      <p role="status" className="w-full text-sm font-bold empty:hidden">
        {message}
      </p>
    </section>
  );
}
