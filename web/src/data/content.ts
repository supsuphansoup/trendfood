import { categoryOptions, tagOptions, type FoodRecord } from "./catalog-schema.ts";
import { photoCredits } from "./photo-credits.ts";

export const contentImages = ["pending", ...Object.keys(photoCredits)];

export type ContentFood = Omit<FoodRecord, "rank" | "change" | "likes" | "videos" | "multiplier" | "trend" | "cookLabel" | "editorial" | "videoId"> & {
  videoId?: string | null;
  sources: { title: string; url: string }[];
  recipeNote: string;
  checkedAt?: string;
};
export type ContentSnapshot = {
  version: 1;
  status: "draft" | "ready";
  checkedAt: string;
  foods: ContentFood[];
};

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 2000): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const positive = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 1440;
const validDate = (v: unknown): v is string => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v && v <= new Date().toISOString().slice(0, 10);
const https = (v: unknown): v is string => {
  if (!text(v)) return false;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
};

/** 빌드·파일 가져오기에서 같은 검증을 사용한다. 초안은 승인 전 공개하지 않는다. */
export function parseContent(raw: unknown, allowDraft = false): ContentSnapshot {
  const fail = (message: string): never => { throw new Error(`콘텐츠 검증 실패: ${message}`); };
  if (!object(raw) || raw.version !== 1) return fail("version은 1이어야 해요");
  if (raw.status !== "ready" && !(allowDraft && raw.status === "draft")) return fail("승인한 ready 콘텐츠만 반영할 수 있어요");
  if (!validDate(raw.checkedAt)) return fail("확인 날짜가 잘못됐어요");
  if (!Array.isArray(raw.foods) || !raw.foods.length || raw.foods.length > 1000) return fail("음식은 1~1000개여야 해요");
  const seen = new Set<string>();
  for (const [index, f] of raw.foods.entries()) {
    const label = `${index + 1}번째 음식`;
    if (!object(f) || !text(f.slug, 80) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug) || seen.has(f.slug)) return fail(`${label}: 주소가 잘못됐거나 중복돼요`);
    seen.add(f.slug);
    if (f.kind !== undefined && f.kind !== "recipe" && f.kind !== "product") return fail(`${label}: 음식 유형이 잘못됐어요`);
    if (f.history !== undefined) {
      const h = f.history;
      if (!object(h) || !Array.isArray(h.years) || !h.years.length || h.years.some((year) => !Number.isInteger(year) || year < 2020 || year > Number(String(f.checkedAt ?? raw.checkedAt).slice(0, 4))) || new Set(h.years).size !== h.years.length || !text(h.note) || !Array.isArray(h.sources) || !h.sources.length || h.sources.some((s) => !object(s) || !text(s.title, 200) || !https(s.url))) return fail(`${label}: 유행 연도와 근거 출처를 확인해 주세요`);
    }
    if (f.checkedAt !== undefined && !validDate(f.checkedAt)) return fail(`${label}: 확인 날짜가 잘못됐어요`);
    for (const key of ["name", "why", "summary", "servings", "alt", "tip", "recipeNote"]) {
      if (!text(f[key], key === "name" ? 30 : 2000)) return fail(`${label}: ${key}를 채워 주세요`);
    }
    if (!(categoryOptions as readonly unknown[]).includes(f.category) || !["쉬움", "보통", "어려움"].includes(String(f.difficulty))) return fail(`${label}: 분류·난이도가 잘못됐어요`);
    if (!positive(f.cookMinutes)) return fail(`${label}: 조리 시간은 1~1440분이어야 해요`);
    if (!contentImages.includes(String(f.image)) || (f.heroImage !== undefined && !contentImages.includes(String(f.heroImage)))) return fail(`${label}: 등록된 사진 키를 사용해 주세요`);
    if (f.heroAlt !== undefined && !text(f.heroAlt)) return fail(`${label}: 큰 사진 설명이 잘못됐어요`);
    if (!Array.isArray(f.tags) || f.tags.some((t) => !(tagOptions as readonly unknown[]).includes(t))) return fail(`${label}: 태그가 잘못됐어요`);
    if (!Array.isArray(f.ingredients) || !f.ingredients.length || f.ingredients.length > 20) return fail(`${label}: 재료를 채워 주세요`);
    const names = new Set<string>();
    for (const ing of f.ingredients) {
      if (!object(ing) || !text(ing.name, 60) || !text(ing.amount, 100) || names.has(ing.name)) return fail(`${label}: 재료명·사용량이 없거나 중복돼요`);
      names.add(ing.name);
      if (ing.price !== undefined) return fail(`${label}: 확인되지 않은 가격은 넣지 마세요`);
      if (ing.url !== undefined && (!https(ing.url) || !/^https:\/\/([a-z0-9-]+\.)*(coupang\.com|coupa\.ng)(\/|$)/.test(ing.url))) return fail(`${label}: 재료 링크는 쿠팡 주소만 사용할 수 있어요`);
      if ([ing.hard, ing.pantry].some((v) => v !== undefined && typeof v !== "boolean")) return fail(`${label}: 재료 표시가 잘못됐어요`);
    }
    if (!Array.isArray(f.steps) || !f.steps.length || f.steps.length > 12 || f.steps.some((s) => !object(s) || !text(s.text) || (s.timerMinutes !== undefined && !positive(s.timerMinutes)))) return fail(`${label}: 조리 단계·타이머가 잘못됐어요`);
    if (!Array.isArray(f.sources) || !f.sources.length || f.sources.some((s) => !object(s) || !text(s.title, 200) || !https(s.url))) return fail(`${label}: 제목과 HTTPS 출처 링크가 필요해요`);
    if (!Array.isArray(f.convenience) || f.convenience.some((c) => !object(c) || !text(c.place, 100) || !text(c.desc))) return fail(`${label}: 구매 안내가 잘못됐어요`);
  }
  return raw as ContentSnapshot;
}

export function contentToRecords(snapshot: ContentSnapshot): FoodRecord[] {
  return snapshot.foods.map(({ sources, recipeNote, checkedAt, ...food }, index) => ({
    ...food,
    videoId: food.videoId ?? null,
    rank: index + 1,
    change: food.history ? `${food.history.years.join("·")}년 화제` : "일상 레시피",
    cookLabel: food.kind === "product" ? "완제품 안내" : `예상 ${food.cookMinutes}분`,
    likes: 0,
    videos: 0,
    multiplier: 0,
    trend: [],
    editorial: { checkedAt: checkedAt ?? snapshot.checkedAt, sources, recipeNote },
  }));
}

/** 같은 주소는 갱신하고 새 주소는 추가한다. 기존 출처 확인 날짜는 보존한다. */
export function mergeContent(current: ContentSnapshot, incoming: ContentSnapshot): ContentSnapshot {
  const foods = new Map(current.foods.map((food) => [food.slug, { ...food, checkedAt: food.checkedAt ?? current.checkedAt }]));
  for (const food of incoming.foods) foods.set(food.slug, { ...food, checkedAt: food.checkedAt ?? incoming.checkedAt });
  return parseContent({ version: 1, status: "ready", checkedAt: [current.checkedAt, incoming.checkedAt].sort().at(-1), foods: [...foods.values()] });
}
