// 트렌드 후보(candidates 표) 공통 규칙. 관리자 화면과 수집 스크립트(scripts/pipeline)가 같이 쓴다.
import { categoryOptions, type Category } from "./catalog-schema.ts";
import type { FoodRow, IngredientRow } from "./db-mapping.ts";

/** 같은 음식인지 비교할 때 쓰는 이름 (띄어쓰기·대소문자 무시) */
export function normalizeName(name: string): string {
  return name.normalize("NFC").replace(/[\s·\-_]+/g, "").toLowerCase();
}

/** 이번 주 월요일 (candidates.week 기본값과 같은 규칙, UTC 기준) */
export function weekOf(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** AI 가 만든 상세 글 초안. 승인하면 foods 표에 '초안' 상태로 들어가고, 운영자가 고친 뒤 게시한다 */
export type CandidateDraft = {
  slug: string;
  why?: string;
  summary?: string;
  tags?: string[];
  cookMinutes?: number;
  difficulty?: "쉬움" | "보통" | "어려움";
  servings?: string;
  ingredients?: { name: string; hard?: boolean; pantry?: boolean }[];
  steps?: { text: string; timerMinutes?: number }[];
  tip?: string;
};

export type CandidateRow = {
  id: string;
  name: string;
  normalized: string;
  category: string;
  note: string;
  source: string;
  origin: "manual" | "pipeline";
  status: "대기" | "승인" | "반려";
  score: number | string | null;
  signals: Record<string, unknown>;
  draft: CandidateDraft | null;
  created_at: string;
  week: string;
};

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const clip = (s: string | undefined, max: number) => (s ?? "").slice(0, max);

/** 승인한 후보 → foods·ingredients 표에 넣을 '초안' 행. 초안이 없거나 주소(slug)가 잘못되면 null */
export function draftToRows(
  c: Pick<CandidateRow, "name" | "category" | "draft" | "signals">,
): { food: Omit<FoodRow, "ingredients">; ingredients: Omit<IngredientRow, "food_slug">[] } | null {
  const d = c.draft;
  if (!d || !SLUG_RE.test(d.slug)) return null;
  const category: Category = (categoryOptions as readonly string[]).includes(c.category) ? (c.category as Category) : "간식";
  const minutes = Math.min(Math.max(Math.round(d.cookMinutes ?? 10), 1), 1440);
  const trend = Array.isArray(c.signals?.trend) ? (c.signals.trend as unknown[]).filter((n) => typeof n === "number") : [];
  const multiplier = typeof c.signals?.multiplier === "number" ? c.signals.multiplier : 1;
  return {
    food: {
      slug: d.slug,
      status: "draft",
      hidden: false,
      sort_order: 1000,
      name: clip(c.name, 30),
      change_label: "새로 들어왔어요",
      why: clip(d.why, 200),
      summary: clip(d.summary, 600),
      category,
      tags: (d.tags ?? []).slice(0, 4),
      cook_minutes: minutes,
      cook_label: `조리 ${minutes}분`,
      difficulty: d.difficulty ?? "쉬움",
      servings: d.servings ?? "",
      likes: 0,
      videos: 0,
      multiplier: Math.round(multiplier * 100) / 100,
      trend: trend.map((n) => Math.round(n as number)),
      image: "dubai",
      alt: `${c.name} 사진 (운영자가 사진을 고르기 전 임시)`,
      hero_image: null,
      hero_alt: null,
      steps: (d.steps ?? []).filter((s) => s.text),
      tip: clip(d.tip, 300),
      convenience: [],
      ai_drafted: true,
    },
    ingredients: (d.ingredients ?? [])
      .filter((i, idx, all) => i.name && all.findIndex((x) => x.name === i.name) === idx)
      .slice(0, 20)
      .map((i, position) => ({
        position,
        name: clip(i.name, 60),
        price: null,
        hard: !!i.hard,
        pantry: !!i.pantry,
        url: null,
      })),
  };
}

/** 쿠팡 주소만 허용 (DB 의 check 제약과 같은 규칙) */
export const COUPANG_URL_RE = /^https:\/\/([a-z0-9-]+\.)*(coupang\.com|coupa\.ng)(\/|$)/;
