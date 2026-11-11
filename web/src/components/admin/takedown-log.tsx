import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanTakedownNote, takedownReasons, type TakedownNote } from "@/data/admin-food-edit.ts";

type Entry = TakedownNote & { id: number; action: "hide" | "show"; created_at: string };
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export function TakedownLog({ db, slug, name, onNotice }: {
  db: SupabaseClient;
  slug: string;
  name: string;
  onNotice: (message: string) => void;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await db.from("takedown_log")
        .select("id,action,reason,memo,created_at").eq("food_slug", slug)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(5);
      if (!active) return;
      if (error) setFailed(true);
      else setEntries(data as Entry[]);
    })();
    return () => { active = false; };
  }, [db, slug]);

  const latest = entries?.[0];
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-t pt-3">
      <legend className="text-lg font-bold">내림 기록</legend>
      {failed ? (
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
          내림 기록을 못 불러왔어요. Supabase SQL Editor 에서 web/supabase/migrations/0003_takedown_log.sql 을 먼저 실행해 주세요.
        </p>
      ) : !entries ? <p className="text-base text-muted-foreground">불러오는 중이에요…</p> : <>
        <ul className="flex list-none flex-col gap-2 p-0 text-sm [overflow-wrap:anywhere]">
          {entries.map((entry) => (
            <li key={entry.id}>
              {dateTime.format(new Date(entry.created_at))} · {entry.action === "hide" ? "숨김" : "다시 보임"} · {entry.reason || "사유 없음"}{entry.memo ? ` · ${entry.memo}` : ""}
            </li>
          ))}
        </ul>
        {latest?.action === "hide" && (
          <form key={latest.id} className="flex min-w-0 flex-col gap-3" onSubmit={async (e) => {
            e.preventDefault();
            if (saving.current) return;
            const data = new FormData(e.currentTarget);
            const result = cleanTakedownNote({ reason: String(data.get("reason")), memo: String(data.get("memo")) });
            if (result.error !== undefined) return onNotice(result.error);
            saving.current = true;
            try {
              const { error } = await db.from("takedown_log").update(result.value).eq("id", latest.id);
              if (error) return onNotice(`저장하지 못했어요: ${error.message}`);
              setEntries(entries.map((entry) => entry.id === latest.id ? { ...entry, ...result.value } : entry));
              onNotice(`${name} 내림 사유를 저장했어요.`);
            } finally {
              saving.current = false;
            }
          }}>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={`${slug}-takedown-reason`}>내림 사유</Label>
              <select id={`${slug}-takedown-reason`} name="reason" defaultValue={latest.reason}
                className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-base">
                {takedownReasons.map((reason) => <option key={reason} value={reason}>{reason || "선택 안 함"}</option>)}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={`${slug}-takedown-memo`}>메모 (200자)</Label>
              <Input id={`${slug}-takedown-memo`} name="memo" defaultValue={latest.memo} maxLength={200}
                aria-describedby={`${slug}-takedown-caption`} className="h-11 text-base" />
              <p id={`${slug}-takedown-caption`} className="text-[13px] text-muted-foreground">요청한 사람의 이름·연락처는 적지 마세요.</p>
            </div>
            <Button type="submit" className="self-start">사유 저장</Button>
          </form>
        )}
      </>}
    </fieldset>
  );
}
