import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FoodBasicInfo } from "@/data/admin-food-edit.ts";
import { FoodBasicInfoEditor } from "./food-basic-info-editor";
import { FoodDetailsEditor, type FoodDetails } from "./food-details-editor";

type Row = FoodDetails & FoodBasicInfo & {
  slug: string;
  name: string;
  status: "draft" | "published";
  hidden: boolean;
  sort_order: number;
  why: string;
  summary: string;
  tip: string;
  ai_drafted: boolean;
};

/** 게시 관리: 순서 바꾸기 · 숨기기 · 게시/초안 · 기본 정보·글·사진·재료·조리법 고치기 */
export function FoodsPanel({ db }: { db: SupabaseClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from("foods")
      .select("slug, name, status, hidden, sort_order, why, summary, tip, ai_drafted, image, alt, steps, category, tags, cook_minutes, cook_label, difficulty, servings, change_label")
      .order("sort_order")
      .order("slug");
    if (error) return setNotice(`목록을 못 불러왔어요: ${error.message}`);
    setRows(data as Row[]);
  }, [db]);

  useEffect(() => {
    // 처음 열 때 한 번 불러온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(slug: string, patch: Partial<Row>, done: string) {
    const { error } = await db.from("foods").update(patch).eq("slug", slug);
    setNotice(error ? `저장하지 못했어요: ${error.message}` : done);
    await load();
  }

  async function move(index: number, dir: -1 | 1) {
    if (!rows) return;
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    // 순서 값이 같을 수도 있으니 목록 순서대로 10 간격으로 다시 매긴 뒤 두 개를 바꾼다
    const order = rows.map((r) => r.slug);
    [order[index], order[index + dir]] = [order[index + dir], order[index]];
    const updates = order
      .map((slug, i) => ({ slug, sort_order: (i + 1) * 10 }))
      .filter((u) => rows.find((r) => r.slug === u.slug)?.sort_order !== u.sort_order);
    for (const u of updates) {
      const { error } = await db.from("foods").update({ sort_order: u.sort_order }).eq("slug", u.slug);
      if (error) {
        setNotice(`순서를 바꾸지 못했어요: ${error.message}`);
        return load();
      }
    }
    setNotice(`${a.name} 순서를 ${dir < 0 ? "올렸어요" : "내렸어요"}.`);
    await load();
  }

  if (!rows) return <p className="text-base text-muted-foreground">{notice || "불러오는 중이에요…"}</p>;

  const published = rows.filter((r) => r.status === "published" && !r.hidden);
  const rankOf = (slug: string) => published.findIndex((r) => r.slug === slug) + 1;

  return (
    <section aria-labelledby="foods-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id="foods-title" className="text-2xl font-black tracking-[-0.02em]">
          게시 관리
        </h2>
        <p className="text-sm text-muted-foreground">
          게시 중 {published.length}개 · 전체 {rows.length}개. 위에 있을수록 순위가 높아요.
        </p>
      </div>
      <p role="status" className="text-sm font-bold empty:hidden">
        {notice}
      </p>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((r, i) => (
          <li key={r.slug} className="flex flex-col gap-3 rounded-2xl border bg-background p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-10 text-xl font-black text-accent">{rankOf(r.slug) || "–"}</span>
              <h3 className="text-lg font-bold">{r.name}</h3>
              <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-bold">
                {r.status === "published" ? (r.hidden ? "숨김" : "게시 중") : "초안"}
              </span>
              {r.ai_drafted && <span className="text-xs text-muted-foreground">AI 초안</span>}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="outline" size="icon" aria-label={`${r.name} 위로`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`${r.name} 아래로`}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Label className="flex h-11 items-center gap-2 px-1 text-sm">
                  <Switch
                    checked={r.hidden}
                    onCheckedChange={(hidden) =>
                      save(r.slug, { hidden }, hidden ? `${r.name}을(를) 숨겼어요.` : `${r.name}을(를) 다시 보이게 했어요.`)
                    }
                  />
                  숨기기
                </Label>
                <Button
                  variant="outline"
                  onClick={() =>
                    r.status === "published"
                      ? save(r.slug, { status: "draft" }, `${r.name}을(를) 초안으로 돌렸어요.`)
                      : save(r.slug, { status: "published" }, `${r.name}을(를) 게시로 바꿨어요. '사이트에 반영'을 눌러 주세요.`)
                  }
                >
                  {r.status === "published" ? "초안으로" : "게시하기"}
                </Button>
                <Button
                  variant="outline"
                  aria-expanded={basicInfo === r.slug}
                  onClick={() => {
                    setEditing(null);
                    setDetails(null);
                    setBasicInfo(basicInfo === r.slug ? null : r.slug);
                  }}
                >
                  기본 정보 고치기
                </Button>
                <Button
                  variant="outline"
                  aria-expanded={editing === r.slug}
                  onClick={() => {
                    setBasicInfo(null);
                    setDetails(null);
                    setEditing(editing === r.slug ? null : r.slug);
                  }}
                >
                  글 고치기
                </Button>
                <Button
                  variant="outline"
                  aria-expanded={details === r.slug}
                  onClick={() => {
                    setBasicInfo(null);
                    setEditing(null);
                    setDetails(details === r.slug ? null : r.slug);
                  }}
                >
                  사진·재료·조리법 고치기
                </Button>
              </div>
            </div>
            {basicInfo === r.slug && <FoodBasicInfoEditor row={r} onNotice={setNotice}
              onSave={(patch) => save(r.slug, patch, `${patch.name} 기본 정보를 저장했어요. '사이트에 반영'을 눌러 주세요.`)} />}
            {editing === r.slug && (
              <TextEditor
                row={r}
                onSave={(patch) => save(r.slug, patch, `${r.name} 글을 저장했어요.`).then(() => setEditing(null))}
              />
            )}
            {details === r.slug && <FoodDetailsEditor row={r} db={db} onNotice={setNotice} onReload={load} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function TextEditor({ row, onSave }: { row: Row; onSave: (patch: Pick<Row, "why" | "summary" | "tip">) => void }) {
  const fields = [
    { key: "why", label: "한 줄 설명 (200자)", max: 200, rows: 2 },
    { key: "summary", label: "왜 뜨는지 요약 (600자)", max: 600, rows: 5 },
    { key: "tip", label: "팁 (300자)", max: 300, rows: 2 },
  ] as const;
  return (
    <form
      className="flex flex-col gap-3 border-t pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({ why: String(f.get("why")), summary: String(f.get("summary")), tip: String(f.get("tip")) });
      }}
    >
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`${row.slug}-${f.key}`}>{f.label}</Label>
          <Textarea id={`${row.slug}-${f.key}`} name={f.key} defaultValue={row[f.key]} maxLength={f.max} rows={f.rows} />
        </div>
      ))}
      <Button type="submit" className="self-start">
        저장
      </Button>
    </form>
  );
}
