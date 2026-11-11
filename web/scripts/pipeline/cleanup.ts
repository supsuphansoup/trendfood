import type { SupabaseClient } from "@supabase/supabase-js";
import { retentionCutoff, stripYoutubeData } from "./logic.ts";

/** 오래된 자동 수집 후보를 1000행씩 읽고 YouTube 유래 값만 정리한다. */
export async function cleanupOldYoutubeData(db: SupabaseClient, now: Date): Promise<number> {
  const cutoff = retentionCutoff(now);
  let cleaned = 0;
  try {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from("candidates")
        .select("id, source, note, signals, score")
        .eq("origin", "pipeline")
        .lte("created_at", cutoff)
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      for (const row of data ?? []) {
        const patch = stripYoutubeData(row);
        if (!patch) continue;
        const { error } = await db.from("candidates").update(patch).eq("id", row.id);
        if (error) throw error;
        cleaned++;
      }
      if (!data || data.length < 1000) return cleaned;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as { message: string }).message;
    throw new Error(`30일 지난 수집값 정리 실패: ${message}`);
  }
}
