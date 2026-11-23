import type { ContentSnapshot } from "../../src/data/content.ts";
import { candidateIdentity } from "../../src/data/candidates.ts";
import type { Scored } from "./logic.ts";

export { publicationDate } from "../../src/data/content.ts";

export const DAILY_NEW_FOOD_LIMIT = 3;
export const IMAGE_ATTEMPTS_PER_FOOD = 2;
export const DAILY_IMAGE_REQUEST_LIMIT = DAILY_NEW_FOOD_LIMIT * IMAGE_ATTEMPTS_PER_FOOD;

export function publishedToday(snapshot: ContentSnapshot, date: string): string[] {
  return snapshot.foods.filter((food) => food.publishedAt === date ||
    (snapshot.recommendation?.date === date && snapshot.recommendation.newSlugs.includes(food.slug))).map((food) => food.slug);
}

export const publicationSlots = (baseline: ContentSnapshot, date: string) =>
  Math.max(0, DAILY_NEW_FOOD_LIMIT - publishedToday(baseline, date).length);

/** 신규·복원 원고를 이번 실행의 인기 점수로 함께 비교한다. 동점이면 최근 검증일·주소순이다. */
export function publicationCandidates(current: ContentSnapshot, baseline: ContentSnapshot, signals: Scored[] = []) {
  const known = new Set(baseline.foods.map((food) => food.slug));
  const scores = new Map<string, number>();
  for (const signal of signals) {
    if (!Number.isFinite(signal.score) || signal.score < 0 || !Number.isFinite(signal.multiplier) || signal.multiplier <= 0 ||
      (!signal.recent && signal.multiplier < 1.3)) continue;
    const name = candidateIdentity(signal.name);
    scores.set(name, Math.max(scores.get(name) ?? 0, signal.score));
  }
  return current.foods.filter((food) => !known.has(food.slug))
    .sort((a, b) => (scores.get(candidateIdentity(b.name)) ?? 0) - (scores.get(candidateIdentity(a.name)) ?? 0) ||
      (b.checkedAt ?? current.checkedAt).localeCompare(a.checkedAt ?? current.checkedAt) || a.slug.localeCompare(b.slug));
}
