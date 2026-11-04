import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CandidateRow, draftToRows, normalizeName } from "@/data/candidates";
import { categoryOptions } from "@/data/catalog-schema";

const statusOrder = { 대기: 0, 승인: 1, 반려: 2 } as const;

/** 후보 큐: 자동 수집·직접 추가한 후보를 승인/반려. 승인하면 AI 초안이 '초안' 글로 들어간다 */
export function QueuePanel({ db }: { db: SupabaseClient }) {
  const [rows, setRows] = useState<CandidateRow[] | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await db.from("candidates").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return setNotice(`후보를 못 불러왔어요: ${error.message}`);
    const list = (data ?? []) as CandidateRow[];
    setRows(list.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || Number(b.score ?? 0) - Number(a.score ?? 0)));
  }, [db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function add(form: HTMLFormElement) {
    const f = new FormData(form);
    const name = String(f.get("name") ?? "").trim();
    if (!name) return;
    const { error } = await db.from("candidates").insert({
      name,
      normalized: normalizeName(name),
      category: String(f.get("category")),
      source: String(f.get("source") ?? "").trim(),
      note: String(f.get("note") ?? "").trim(),
      origin: "manual",
    });
    if (error) return setNotice(error.code === "23505" ? "이번 주에 이미 있는 후보예요." : `추가하지 못했어요: ${error.message}`);
    form.reset();
    setNotice(`${name}을(를) 후보에 넣었어요.`);
    await load();
  }

  async function approve(c: CandidateRow) {
    const rows = draftToRows(c);
    if (rows) {
      const { error } = await db.from("foods").insert(rows.food);
      if (error) {
        return setNotice(
          error.code === "23505" ? `주소 ${rows.food.slug} 가 이미 있어요. 게시 관리에서 확인해 주세요.` : `초안을 만들지 못했어요: ${error.message}`,
        );
      }
      if (rows.ingredients.length) {
        const { error: ingError } = await db
          .from("ingredients")
          .insert(rows.ingredients.map((i) => ({ ...i, food_slug: rows.food.slug })));
        if (ingError) setNotice(`재료를 넣지 못했어요: ${ingError.message}`);
      }
    }
    const { error } = await db.from("candidates").update({ status: "승인" }).eq("id", c.id);
    if (error) return setNotice(`승인하지 못했어요: ${error.message}`);
    setNotice(
      rows
        ? `${c.name} 승인. 게시 관리에 초안으로 들어갔어요. 사진·재료 링크를 채우고 게시하세요.`
        : `${c.name} 승인. AI 초안이 없어서 상세 글은 직접 써야 해요.`,
    );
    await load();
  }

  async function reject(c: CandidateRow) {
    const { error } = await db.from("candidates").update({ status: "반려" }).eq("id", c.id);
    setNotice(error ? `반려하지 못했어요: ${error.message}` : `${c.name}을(를) 반려했어요.`);
    await load();
  }

  return (
    <section aria-labelledby="queue-title" className="flex flex-col gap-4">
      <h2 id="queue-title" className="text-2xl font-black tracking-[-0.02em]">
        후보 큐
      </h2>
      <form
        aria-label="후보 직접 추가"
        className="grid gap-3 rounded-2xl border bg-background p-4 md:grid-cols-[1fr_140px_1fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void add(e.currentTarget);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cand-name">음식 이름</Label>
          <Input className="h-11 text-base" id="cand-name" name="name" maxLength={30} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cand-category">카테고리</Label>
          <select id="cand-category" name="category" className="h-11 rounded-lg border border-line-strong bg-background px-3 text-base">
            {categoryOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cand-source">어디서 봤나요</Label>
          <Input className="h-11 text-base" id="cand-source" name="source" placeholder="영상 주소나 출처" />
        </div>
        <Button type="submit">후보 추가</Button>
      </form>
      <p role="status" className="text-sm font-bold empty:hidden">
        {notice}
      </p>
      {!rows ? (
        <p className="text-base text-muted-foreground">불러오는 중이에요…</p>
      ) : rows.length === 0 ? (
        <p className="text-base text-muted-foreground">후보가 아직 없어요. 자동 수집은 매일 아침 6시에 돌아요.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-background p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{c.name}</h3>
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-bold">{c.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.category} · {c.origin === "pipeline" ? "자동 수집" : "직접 추가"}
                    {c.score != null && ` · 급상승 ${Number(c.score).toFixed(1)}배`}
                    {c.draft && " · AI 초안 있음"}
                  </span>
                </div>
                {(c.note || c.source) && (
                  <p className="text-sm break-all text-muted-foreground">{[c.note, c.source].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              {c.status === "대기" && (
                <div className="flex gap-2">
                  <Button onClick={() => approve(c)} aria-label={`${c.name} 승인`}>
                    승인
                  </Button>
                  <Button variant="outline" onClick={() => reject(c)} aria-label={`${c.name} 반려`}>
                    반려
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
