import type { ContentSnapshot } from "../../src/data/content.ts";

export const DAILY_NEW_FOOD_LIMIT = 3;
export const IMAGE_ATTEMPTS_PER_FOOD = 2;
export const DAILY_IMAGE_REQUEST_LIMIT = DAILY_NEW_FOOD_LIMIT * IMAGE_ATTEMPTS_PER_FOOD;
export const publicationDate = (now: Date) => new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function publishedToday(snapshot: ContentSnapshot, date: string): string[] {
  return snapshot.foods.filter((food) => food.publishedAt === date ||
    (snapshot.recommendation?.date === date && snapshot.recommendation.newSlugs.includes(food.slug))).map((food) => food.slug);
}

export const publicationSlots = (baseline: ContentSnapshot, date: string) =>
  Math.max(0, DAILY_NEW_FOOD_LIMIT - publishedToday(baseline, date).length);

/** 오늘 검증한 새 원고를 먼저 처리하고, 부족하면 원문 재확인한 대기 원고로 채운다. */
export function publicationCandidates(current: ContentSnapshot, baseline: ContentSnapshot) {
  const known = new Set(baseline.foods.map((food) => food.slug));
  return current.foods.filter((food) => !known.has(food.slug))
    .sort((a, b) => (b.checkedAt ?? current.checkedAt).localeCompare(a.checkedAt ?? current.checkedAt));
}
