import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type RecommendationReport = { date: string; deferred: { reason: string }[] };
type AutomationReport = { accepted: unknown[] };

export function publicationSummary(automatic: AutomationReport, recommendation: RecommendationReport) {
  return {
    date: recommendation.date,
    verified: automatic.accepted.length,
    photoWaiting: recommendation.deferred.filter(({ reason }) => reason === "게시 가능한 음식 사진 미확보").length,
  };
}

async function readReport<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(new URL(`../../data/${name}-report.json`, import.meta.url), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function reportPublication() {
  const [automatic, recommendation] = await Promise.all([
    readReport<AutomationReport>("automation"),
    readReport<RecommendationReport>("recommendation"),
  ]);
  if (!automatic || !recommendation) return;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PIPELINE_RUN_ID } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PIPELINE_RUN_ID) throw new Error("수집 실행 기록 설정이 없어요.");
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.from("pipeline_runs").select("summary").eq("id", PIPELINE_RUN_ID).single();
  if (error) throw new Error(error.message);
  const publication = publicationSummary(automatic, recommendation);
  const { error: saveError } = await db.from("pipeline_runs").update({ summary: { ...data.summary, publication } }).eq("id", PIPELINE_RUN_ID);
  if (saveError) throw new Error(saveError.message);
  console.log(`관리자 집계 저장: 원고 검증 ${publication.verified}개, 사진 대기 ${publication.photoWaiting}개`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await reportPublication();
