import { candidateIdentity } from "../../src/data/candidates.ts";
import { parseContent, type ContentSnapshot } from "../../src/data/content.ts";
import type { Scored } from "./logic.ts";
import { generatedImages } from "../../src/data/generated-images.ts";
import { readyPending, restorePending, type DiscoveryState } from "./discovery.ts";
import type { RecipeVideo } from "./sources.ts";

export type RecommendationInput = { baseline: ContentSnapshot; signals: Scored[]; date: string };

/** 등록한 생성 사진만 사용한다. 원고 생성·사진 검색 없이 공식 출처를 다시 확인한다. */
export async function publishPendingPhotos(current: ContentSnapshot, state: DiscoveryState, date: string, descriptions: (ids: string[]) => Promise<RecipeVideo[]>) {
  const known = new Set(current.foods.map((food) => food.slug));
  const eligible = { ...state, pending: state.pending.filter(({ food }) => !known.has(food.slug) && Object.values(generatedImages).some((image) => image.slug === food.slug)) };
  const verified = await readyPending(eligible, date, descriptions);
  const restored = restorePending(current, verified);
  const result = refreshRecommendations(restored, { baseline: current, signals: [], date });
  const accepted = result.snapshot.foods.filter((food) => !known.has(food.slug)).map(({ name, slug }) => ({ name, slug }));
  const published = new Set(result.snapshot.foods.map((food) => food.slug));
  return { ...result, accepted,
    deferred: state.pending.filter(({ food }) => !published.has(food.slug)).map(({ food }) => ({ name: food.name, slug: food.slug,
      reason: eligible.pending.some((item) => item.food.slug === food.slug) ? "최근 제작자·원문 근거 재확인 미통과" : "등록한 생성 예시 사진 없음" })),
  };
}

/** 기존 수집 결과만 재사용한다. 신규 검증과 추천 순환을 분리해 오래된 음식을 신규로 표시하지 않는다. */
export function refreshRecommendations(current: ContentSnapshot, input: RecommendationInput) {
  const { baseline, signals, date } = input;
  if ([baseline.recommendation, current.recommendation].some((edition) => edition && date < edition.date)) throw new Error("이전 날짜의 추천은 반영하지 않아요");
  const known = new Set(baseline.foods.map((food) => food.slug));
  // 원문 검증을 통과한 음식의 빈 사진만, 같은 음식으로 등록한 생성 예시에 연결한다.
  current = { ...current, foods: current.foods.map((food) => {
    const registered = Object.entries(generatedImages).find(([, image]) => image.slug === food.slug);
    if (!registered) return food;
    const [key, image] = registered;
    return { ...food,
      ...(food.image === "pending" ? { image: key, alt: image.title } : {}),
      ...(food.heroImage === "pending" ? { heroImage: key, heroAlt: image.title } : {}),
    };
  }) };
  const deferred = current.foods.filter((food) => !known.has(food.slug) &&
    (food.image === "pending" || food.heroImage === "pending"))
    .map((food) => ({ name: food.name, slug: food.slug, reason: "게시 가능한 음식 사진 미확보" }));
  const blocked = new Set(deferred.map((food) => food.slug));
  const foods = current.foods.filter((food) => !blocked.has(food.slug));
  const edition = current.recommendation?.date === date ? current : baseline;
  const sameDay = edition.recommendation?.date === date;
  const newSlugs = [...new Set([
    ...foods.filter((food) => !known.has(food.slug)).map((food) => food.slug),
    ...(sameDay ? edition.recommendation!.newSlugs.filter((slug) => foods.some((food) => food.slug === slug)) : []),
  ])];
  let basis: "new" | "trend" | "rotation" = "rotation";
  let ordered = foods;
  if (newSlugs.length) {
    basis = "new";
    ordered = [...newSlugs.map((slug) => foods.find((food) => food.slug === slug)!), ...foods.filter((food) => !newSlugs.includes(food.slug))];
  } else if (sameDay) {
    basis = edition.recommendation!.basis;
    const positions = new Map(edition.foods.map((food, index) => [food.slug, index]));
    ordered = [...foods].sort((a, b) => positions.get(a.slug)! - positions.get(b.slug)!);
  } else {
    const ranked = signals.filter((signal) => Number.isFinite(signal.multiplier) && signal.multiplier >= 1.3 &&
      Number.isFinite(signal.score) && signal.trend.length >= 2 && signal.trend.every(Number.isFinite))
      .sort((a, b) => b.score - a.score);
    const selected = [...new Set(ranked.flatMap((signal) => foods.filter((food) =>
      candidateIdentity(food.name) === candidateIdentity(signal.name)).map((food) => food.slug)))];
    // 같은 음식만 계속 대표가 되면 다음 추천을 고른다. 순환을 검색량 상승으로 설명하지 않는다.
    if (selected[0] === baseline.foods[0].slug) selected.push(selected.shift()!);
    if (selected.length && (selected[0] !== baseline.foods[0].slug || foods.length === 1)) {
      basis = "trend";
      ordered = [...selected.map((slug) => foods.find((food) => food.slug === slug)!), ...foods.filter((food) => !selected.includes(food.slug))];
    } else ordered = [...foods.slice(1), ...foods.slice(0, 1)];
  }
  const snapshot = parseContent({ ...current,
    // 추천 갱신으로 레시피 근거 확인 날짜가 바뀌지 않도록 각 음식의 날짜를 고정한다.
    foods: ordered.map((food) => ({ ...food, ...(!known.has(food.slug) && !food.publishedAt ? { publishedAt: date } : {}), checkedAt: food.checkedAt ?? (known.has(food.slug) ? baseline.checkedAt : current.checkedAt) })),
    recommendation: { date, basis, newSlugs },
  });
  return { snapshot, deferred };
}
