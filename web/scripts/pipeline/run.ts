// 매일 트렌드 후보 수집 (GitHub Actions 가 하루 1번 실행, 손으로는 npm run pipeline)
// 1) YouTube 인기 음식 영상 제목  2) LLM 이 음식 이름 추출  3) 네이버 검색량 급상승 배수
// 4) 이미 있는 음식 빼고 상위 후보를 candidates 표에 '대기'로 넣음 (+ 상위 몇 개는 AI 상세 글 초안)
// 운영자가 관리자 화면 '후보 큐'에서 승인해야 사이트에 올라간다. 자동 게시는 하지 않는다.
//
// 키가 없으면 그 단계는 예시 값으로 대신하고, Supabase 키가 없거나 --dry-run 이면 DB 에 쓰지 않고 화면에만 보여 준다.
import { createClient } from "@supabase/supabase-js";
import { type CandidateDraft, normalizeName, weekOf } from "../../src/data/candidates.ts";
import { cleanupOldYoutubeData } from "./cleanup.ts";
import { AiQuotaError, aiConfig, askJson, draftPrompt, draftSchema, extractPrompt, extractSchema } from "./llm.ts";
import { cleanExtracted, type Extracted, pickCandidates, risingMultiplier, type Scored, scaleTrend, scoreOf } from "./logic.ts";
import { naverTrend, searchYoutube, type Video } from "./sources.ts";

const env = process.env;
const dryRun = process.argv.includes("--dry-run") || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_QUERIES = (env.PIPELINE_QUERIES || "요즘 유행 음식,유행 디저트 만들기,편의점 신상 디저트,자취 요리 유행,SNS 화제 레시피")
  .split(",")
  .map((q) => q.trim())
  .filter(Boolean);
const DRAFT_LIMIT = Number(env.PIPELINE_DRAFTS || 3);

const log = (...a: unknown[]) => console.log("[pipeline]", ...a);

async function main() {
  const db = dryRun ? null : createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const runId = db
    ? ((await db.from("pipeline_runs").insert({}).select("id").single()).data?.id as number | undefined)
    : undefined;
  const summary: Record<string, unknown> = { dryRun };

  try {
    if (db) {
      summary.cleaned = await cleanupOldYoutubeData(db, new Date());
      log(`30일 정리: ${summary.cleaned}개`);
    } else {
      log("DB 없음 → 30일 정리 건너뜀");
    }

    // 1) 영상 제목
    let videos: Video[] = [];
    if (env.YOUTUBE_API_KEY) {
      for (const q of SEED_QUERIES) videos.push(...(await searchYoutube(q, env.YOUTUBE_API_KEY)));
      videos = [...new Map(videos.map((v) => [v.id, v])).values()];
    } else {
      log("YOUTUBE_API_KEY 없음 → 예시 제목 사용");
      videos = sampleTitles.map((title, i) => ({ id: `sample-${i}`, title }));
    }
    summary.videos = videos.length;
    log(`영상 ${videos.length}개`);

    // 2) 음식 이름 추출
    let extracted: Extracted[];
    if (aiConfig()) {
      extracted = cleanExtracted(await askJson(extractPrompt(videos.map((v) => v.title)), extractSchema));
    } else {
      log("AI 설정 없음 → 예시 추출 결과 사용");
      extracted = cleanExtracted({ foods: sampleExtracted });
    }
    summary.extracted = extracted.length;
    log(`음식 이름 ${extracted.length}개: ${extracted.map((e) => e.name).join(", ")}`);

    // 3) 검색량 급상승 배수
    let trends = new Map<string, number[]>();
    if (env.NAVER_API_HUB_KEY_ID && env.NAVER_API_HUB_KEY) {
      trends = await naverTrend(extracted.map((e) => e.name), env.NAVER_API_HUB_KEY_ID, env.NAVER_API_HUB_KEY);
    } else {
      log("네이버 키 없음 → 예시 검색량 사용");
      for (const [i, e] of extracted.entries()) trends.set(e.name, sampleSeries(i));
    }
    const scored: Scored[] = extracted.map((e) => {
      const series = trends.get(e.name) ?? [];
      const multiplier = risingMultiplier(series);
      return { ...e, multiplier, trend: scaleTrend(series), score: scoreOf(multiplier, e.mentions) };
    });

    // 4) 이미 있는 음식·이번 주 후보 제외
    const known: string[] = [];
    if (db) {
      const [{ data: foods }, { data: cands }] = await Promise.all([
        db.from("foods").select("name"),
        db.from("candidates").select("normalized").eq("week", weekOf()),
      ]);
      known.push(...(foods ?? []).map((f) => f.name as string), ...(cands ?? []).map((c) => c.normalized as string));
    }
    const picked = pickCandidates(scored, known, { minMultiplier: Number(env.PIPELINE_MIN_MULTIPLIER || 1.3) });
    log(`후보 ${picked.length}개: ${picked.map((p) => `${p.name}(${p.multiplier}배)`).join(", ")}`);

    // 5) 상위 몇 개는 AI 상세 글 초안
    const rows = [];
    for (const [i, p] of picked.entries()) {
      const titles = videos.map((v) => v.title).filter((t) => normalizeName(t).includes(normalizeName(p.name)));
      let draft: CandidateDraft | null = null;
      if (i < DRAFT_LIMIT && aiConfig()) {
        try {
          draft = (await askJson(draftPrompt(p.name, p.multiplier, titles), draftSchema)) as CandidateDraft;
        } catch (e) {
          if (e instanceof AiQuotaError) throw e;
          log(`${p.name} 초안 실패: ${(e as Error).message}`);
        }
      }
      rows.push({
        name: p.name.slice(0, 30),
        normalized: normalizeName(p.name),
        category: p.category,
        origin: "pipeline",
        source: titles[0] ? `영상 제목: ${titles[0]}`.slice(0, 200) : "",
        note: `영상 ${p.mentions}개 언급`,
        score: p.score,
        signals: { multiplier: p.multiplier, trend: p.trend, videos: titles.length, mentions: p.mentions },
        draft,
        week: weekOf(),
      });
    }

    if (db && rows.length) {
      const { error, count } = await db
        .from("candidates")
        .upsert(rows, { onConflict: "normalized,week", ignoreDuplicates: true, count: "exact" });
      if (error) throw new Error(`후보 저장 실패: ${error.message}`);
      summary.inserted = count ?? rows.length;
    } else {
      summary.inserted = 0;
      if (dryRun) log("DB 에 쓰지 않음 (dry-run). 넣었을 후보:", JSON.stringify(rows, null, 2));
    }
    if (db && runId) await db.from("pipeline_runs").update({ finished_at: new Date().toISOString(), ok: true, summary }).eq("id", runId);
    log("완료", summary);
  } catch (e) {
    const message = e instanceof AiQuotaError ? `AI 크레딧·무료 한도 소진 (${e.message})` : (e as Error).message;
    summary.error = message;
    if (db && runId) await db.from("pipeline_runs").update({ finished_at: new Date().toISOString(), ok: false, summary }).eq("id", runId);
    console.error("[pipeline] 실패:", message);
    process.exitCode = 1;
  }
}

// ── 키 없이 돌려 볼 때 쓰는 예시 값 (실제 데이터 아님) ─────────
const sampleTitles = [
  "요즘 난리난 버터떡 집에서 만들기",
  "편의점 신상 두바이 쫀득쿠키 솔직 후기",
  "10분 컷 마약 계란 장조림",
  "버터떡 3가지 맛 비교",
  "자취생 필수 레시피 대패 숙주 볶음",
];
const sampleExtracted = [
  { name: "버터떡", category: "간식", mentions: 2 },
  { name: "두바이 쫀득쿠키", category: "디저트", mentions: 1 },
  { name: "마약 계란 장조림", category: "밥", mentions: 1 },
  { name: "대패 숙주 볶음", category: "밥", mentions: 1 },
];
const sampleSeries = (i: number) => Array.from({ length: 14 }, (_, d) => 10 + (d >= 11 ? (4 - i) * 8 : 0));

await main();
