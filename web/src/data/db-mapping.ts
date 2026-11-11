// Supabase 행 ↔ FoodRecord 변환. 사이트 빌드·관리자 화면·수집 스크립트가 같이 쓴다 (Node 로 바로 실행 가능).
import { categoryOptions, type Category, type FoodRecord, type Ingredient, type Step } from "./catalog-schema.ts";

export type FoodRow = {
  slug: string;
  status: "draft" | "published";
  hidden: boolean;
  sort_order: number;
  name: string;
  change_label: string;
  why: string;
  summary: string;
  category: string;
  tags: string[];
  cook_minutes: number;
  cook_label: string;
  difficulty: string;
  servings: string;
  likes: number;
  videos: number;
  video_id?: string | null;
  multiplier: number | string;
  trend: number[];
  image: string;
  alt: string;
  hero_image: string | null;
  hero_alt: string | null;
  steps: unknown;
  tip: string;
  convenience: unknown;
  ai_drafted?: boolean;
  ingredients?: unknown;
};

export type IngredientRow = {
  food_slug: string;
  position: number;
  name: string;
  price: number | null;
  hard: boolean;
  pantry: boolean;
  url: string | null;
};

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const isCategory = (v: string): v is Category => (categoryOptions as readonly string[]).includes(v);
const difficulty = (v: string): FoodRecord["difficulty"] => (v === "보통" || v === "어려움" ? v : "쉬움");

function toIngredient(v: unknown): Ingredient | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name) return null;
  return {
    name: o.name,
    price: typeof o.price === "number" ? o.price : undefined,
    hard: o.hard === true || undefined,
    pantry: o.pantry === true || undefined,
    url: typeof o.url === "string" && o.url ? o.url : undefined,
  };
}

function toStep(v: unknown): Step | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.text !== "string" || !o.text) return null;
  return { text: o.text, timerMinutes: typeof o.timerMinutes === "number" && o.timerMinutes > 0 ? o.timerMinutes : undefined };
}

/** published_foods 뷰의 행을 FoodRecord 로. rank 는 정렬 뒤 따로 매긴다 */
export function rowToRecord(row: FoodRow): Omit<FoodRecord, "rank"> {
  return {
    slug: row.slug,
    name: row.name,
    change: row.change_label,
    why: row.why,
    summary: row.summary,
    category: isCategory(row.category) ? row.category : "간식",
    tags: row.tags ?? [],
    cookMinutes: row.cook_minutes,
    cookLabel: row.cook_label || `조리 ${row.cook_minutes}분`,
    difficulty: difficulty(row.difficulty),
    servings: row.servings,
    likes: row.likes,
    videos: row.videos,
    videoId: typeof row.video_id === "string" && /^[A-Za-z0-9_-]{11}$/.test(row.video_id) ? row.video_id : null,
    multiplier: Number(row.multiplier) || 1,
    trend: row.trend?.length ? row.trend : [1, 1],
    image: row.image,
    alt: row.alt,
    heroImage: row.hero_image ?? undefined,
    heroAlt: row.hero_alt ?? undefined,
    ingredients: asArray(row.ingredients).map(toIngredient).filter((x): x is Ingredient => x !== null),
    steps: asArray(row.steps).map(toStep).filter((x): x is Step => x !== null),
    tip: row.tip,
    convenience: asArray(row.convenience).filter(
      (c): c is { place: string; desc: string } =>
        !!c && typeof c === "object" && typeof (c as { place?: unknown }).place === "string",
    ),
  };
}

/** sort_order 순으로 정렬된 행에 1위부터 순위를 매긴다 */
export function rowsToRecords(rows: FoodRow[]): FoodRecord[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug))
    .map((row, i) => ({ ...rowToRecord(row), rank: i + 1 }));
}

/** FoodRecord → foods 테이블 행 (초기 데이터 넣기·AI 초안 저장용) */
export function recordToRow(r: FoodRecord, extra: Partial<FoodRow> = {}): Omit<FoodRow, "ingredients"> {
  return {
    slug: r.slug,
    status: "published",
    hidden: false,
    sort_order: r.rank * 10,
    name: r.name,
    change_label: r.change,
    why: r.why,
    summary: r.summary,
    category: r.category,
    tags: r.tags,
    cook_minutes: r.cookMinutes,
    cook_label: r.cookLabel,
    difficulty: r.difficulty,
    servings: r.servings,
    likes: r.likes,
    videos: r.videos,
    video_id: r.videoId,
    multiplier: r.multiplier,
    trend: r.trend,
    image: r.image,
    alt: r.alt,
    hero_image: r.heroImage ?? null,
    hero_alt: r.heroAlt ?? null,
    steps: r.steps,
    tip: r.tip,
    convenience: r.convenience,
    ...extra,
  };
}

export function recordToIngredientRows(r: FoodRecord): IngredientRow[] {
  return r.ingredients.map((ing, i) => ({
    food_slug: r.slug,
    position: i,
    name: ing.name,
    price: ing.price ?? null,
    hard: !!ing.hard,
    pantry: !!ing.pantry,
    url: ing.url ?? null,
  }));
}
