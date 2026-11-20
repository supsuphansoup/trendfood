import type { FoodRecord } from "./catalog-schema.ts";

/** 기존 콘텐츠 재추천·출처 재확인은 신규 등록으로 세지 않는다. */
export function recentlyPublished(food: Pick<FoodRecord, "publishedAt">, today: string) {
  if (!food.publishedAt) return false;
  const age = (Date.parse(today) - Date.parse(food.publishedAt)) / 86_400_000;
  return Number.isFinite(age) && age >= 0 && age < 30;
}
