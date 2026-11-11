// 수집 파이프라인의 계산 부분 (외부 호출 없음 → node --test 로 검사)
import { type CandidateRow, normalizeName } from "../../src/data/candidates.ts";
import { categoryOptions, type Category } from "../../src/data/catalog-schema.ts";

export type Extracted = { name: string; category: Category; mentions: number };

export const YOUTUBE_RETENTION_DAYS = 29;

export function retentionCutoff(now: Date): string {
  return new Date(now.getTime() - YOUTUBE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

type YoutubeData = Pick<CandidateRow, "source" | "note" | "signals" | "score">;

/** YouTube 유래 값만 비우고, 변경이 없으면 DB 요청을 생략한다. */
export function stripYoutubeData(row: YoutubeData): Partial<YoutubeData> | null {
  const patch: Partial<YoutubeData> = {};
  if (row.source.startsWith("영상 제목:")) patch.source = "";
  if (row.note.match(/^영상 \d+개 언급$/)?.[0] === row.note) patch.note = "";
  if (Object.hasOwn(row.signals, "videos") || Object.hasOwn(row.signals, "mentions")) {
    const signals = { ...row.signals };
    delete signals.videos;
    delete signals.mentions;
    patch.signals = signals;
  }
  if (row.score !== null) patch.score = null;
  return Object.keys(patch).length ? patch : null;
}

/** 최근 days 일 평균 ÷ 그 앞 기간 평균. 앞 기간이 0이면 새로 뜬 것으로 보고 최근값 그대로 (최대 99) */
export function risingMultiplier(series: number[], recentDays = 3): number {
  if (series.length <= recentDays) return 1;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recent = avg(series.slice(-recentDays));
  const before = avg(series.slice(0, -recentDays));
  if (before <= 0) return recent > 0 ? Math.min(99, recent) : 1;
  return Math.round((recent / before) * 100) / 100;
}

/** 그래프용: 가장 큰 값을 100으로 맞춘 정수 */
export function scaleTrend(series: number[]): number[] {
  const max = Math.max(0, ...series);
  return series.map((v) => (max > 0 ? Math.round((v / max) * 100) : 0));
}

/** LLM 이 돌려준 음식 목록을 검사·정리 (이상한 값은 버린다) */
export function cleanExtracted(raw: unknown): Extracted[] {
  const list = (raw && typeof raw === "object" && Array.isArray((raw as { foods?: unknown }).foods)
    ? (raw as { foods: unknown[] }).foods
    : []) as Record<string, unknown>[];
  const seen = new Set<string>();
  const out: Extracted[] = [];
  for (const item of list) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    if (name.length < 2 || name.length > 30) continue;
    const key = normalizeName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const category = (categoryOptions as readonly string[]).includes(String(item.category))
      ? (item.category as Category)
      : "간식";
    const mentions = Number.isFinite(Number(item.mentions)) ? Math.max(1, Math.round(Number(item.mentions))) : 1;
    out.push({ name, category, mentions });
  }
  return out;
}

export type Scored = Extracted & { multiplier: number; trend: number[]; score: number };

/** 이미 사이트에 있거나 이번 주 후보에 있는 음식은 빼고, 급상승 배수 기준으로 고른다 */
export function pickCandidates(
  items: Scored[],
  known: Iterable<string>,
  { minMultiplier = 1.3, limit = 10 } = {},
): Scored[] {
  const skip = new Set([...known].map(normalizeName));
  return items
    .filter((i) => !skip.has(normalizeName(i.name)) && i.multiplier >= minMultiplier)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 점수 = 급상승 배수 × (1 + 영상 언급 수의 로그). 영상에 많이 나올수록 조금 더 위로 */
export const scoreOf = (multiplier: number, mentions: number) =>
  Math.round(multiplier * (1 + Math.log2(Math.max(1, mentions))) * 100) / 100;

/** YYYY-MM-DD (UTC) */
export const ymd = (d: Date) => d.toISOString().slice(0, 10);
