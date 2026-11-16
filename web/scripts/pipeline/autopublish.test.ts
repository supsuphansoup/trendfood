import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseContent } from "../../src/data/content.ts";
import { automaticUpdate, verifiedFood, verifiedIntroduction } from "./autopublish.ts";
import { AiQuotaError } from "./llm.ts";
import type { Scored } from "./logic.ts";
import { recipeDescriptions, type RecipeVideo } from "./sources.ts";
import { generatedImages } from "../../src/data/generated-images.ts";

const checkedAt = "2026-11-12";
const current = parseContent(JSON.parse(await readFile(new URL("../../src/data/content/foods.json", import.meta.url), "utf8")));
const candidate: Scored = { name: "레몬 크림 누들", category: "면", mentions: 2, multiplier: 2, trend: Array(14).fill(30), score: 4 };
const recipe = {
  complete: true, sourceId: "Abcdef_1234", slug: "lemon-cream-noodles", why: "레몬 향을 더한 면 요리예요.", summary: "우유와 레몬즙으로 소스를 만드는 면 요리예요.",
  tags: [], cookMinutes: 10, difficulty: "쉬움", servings: "2인분",
  ingredients: [{ name: "면", amount: "100g" }, { name: "우유", amount: "200ml" }, { name: "레몬즙", amount: "1큰술" }],
  steps: [{ text: "면을 10분 삶아요.", timerMinutes: 10 }, { text: "우유와 레몬즙을 섞어 면에 넣어요.", timerMinutes: 0 }],
  tip: "원문의 조리 안내를 함께 확인하세요.", timeEvidence: "전체 조리 시간 10분", servingsEvidence: "분량 2인분",
  ingredientEvidence: ["면 100g", "우유 200ml", "레몬즙 1큰술"],
  stepEvidence: ["면을 10분 삶으세요.", "우유와 레몬즙을 섞어서 삶은 면에 넣으세요."],
};
const description = [recipe.timeEvidence, recipe.servingsEvidence, ...recipe.ingredientEvidence, ...recipe.stepEvidence].join("\n");
const videos: RecipeVideo[] = [
  { id: "Abcdef_1234", title: "레몬 크림 누들 만들기", channelId: "creator-a", publishedAt: "2026-11-11T01:00:00Z", description },
  { id: "Bcdefg_1234", title: "요즘 레몬 크림 누들", channelId: "creator-b", publishedAt: "2026-11-10T01:00:00Z", description: "레몬 크림 누들 소개" },
];
const dependencies = { descriptions: async () => videos, generate: async () => structuredClone(recipe) };
const introduction = { ...recipe, complete: false, introduction: { sourceId: videos[1].id, excerpt: videos[1].description } };

test("음식 소개에 뒤늦게 조리법을 붙일 때 주소·사진을 보존하고 조리법이 없으면 변경하지 않는다", async () => {
  const photo = current.foods.find((food) => !generatedImages[food.image] && !generatedImages[food.heroImage ?? ""])!;
  const intro = { ...verifiedIntroduction(candidate, videos, introduction, checkedAt), image: photo.image, alt: photo.alt };
  const baseline = parseContent({ ...current, foods: [...current.foods, intro] });
  const unchanged = await automaticUpdate(baseline, [candidate], videos, { ...dependencies, generate: async () => introduction }, checkedAt);
  assert.equal(unchanged.snapshot, baseline);
  assert.equal(unchanged.accepted.length, 0);
  const upgraded = await automaticUpdate(baseline, [candidate], videos, { ...dependencies, generate: async () => ({ ...recipe, slug: "another-recipe-address" }) }, checkedAt);
  assert.equal(upgraded.accepted.length, 1);
  assert.equal(upgraded.snapshot.foods.length, baseline.foods.length);
  const food = upgraded.snapshot.foods.at(-1)!;
  assert.equal(food.kind, "recipe");
  assert.equal(food.slug, intro.slug);
  assert.equal(food.image, photo.image);
  assert.deepEqual(food.ingredients, recipe.ingredients);
});

test("먹방 음식 소개: 완전한 조리법 없이도 원문 인용과 상승 근거를 확인해 소개만 추가한다", async () => {
  let calls = 0;
  const result = await automaticUpdate(current, [candidate], videos, { ...dependencies, generate: async () => { calls++; return introduction; } }, checkedAt);
  assert.equal(calls, 1);
  assert.equal(result.accepted.length, 1);
  const food = result.snapshot.foods.at(-1)!;
  assert.equal(food.kind, "discovery");
  assert.equal(food.cookMinutes, 0);
  assert.deepEqual(food.ingredients, []);
  assert.deepEqual(food.steps, []);
  assert.equal(food.summary, `원문 소개: “${videos[1].description}”`);
  assert.equal(food.image, "pending");
  assert.match(food.recipeNote, /개별 검수는 하지 않았어요/);
  assert.deepEqual(result.snapshot.foods.slice(0, current.foods.length), current.foods);
  assert.doesNotThrow(() => parseContent(result.snapshot));
});

test("먹방 음식 소개: 제목만 있는 원문도 확인하되 없는 음식·특징·출처·긴 인용은 거절한다", () => {
  const raw = { ...introduction, introduction: { sourceId: videos[0].id, excerpt: videos[0].title } };
  assert.equal(verifiedIntroduction(candidate, videos, raw, checkedAt).summary, `원문 소개: “${videos[0].title}”`);
  for (const patch of [null, { sourceId: "wrong", excerpt: videos[0].title }, { sourceId: videos[0].id, excerpt: "레몬 크림 누들은 1위이고 1000원이에요" }, { sourceId: videos[0].id, excerpt: "없는 음식 소개" }, { sourceId: videos[0].id, excerpt: "가".repeat(121) }]) {
    assert.throws(() => verifiedIntroduction(candidate, videos, { ...raw, introduction: patch }, checkedAt));
  }
  assert.throws(() => verifiedIntroduction(candidate, videos, { ...raw, complete: true }, checkedAt));
});

test("먹방 음식 소개도 서로 다른 제작자와 검색 상승 검증을 우회하지 못한다", async () => {
  let calls = 0;
  const deps = { ...dependencies, generate: async () => { calls++; return introduction; } };
  const single = await automaticUpdate(current, [candidate], videos, { ...deps, descriptions: async () => videos.slice(0, 1) }, checkedAt);
  const flat = await automaticUpdate(current, [{ ...candidate, multiplier: 1 }], videos, deps, checkedAt);
  assert.equal(calls, 0);
  assert.equal(single.accepted.length + flat.accepted.length, 0);
  assert.equal(single.snapshot, current);
});

test("자동 반영: 원문 레시피와 상승 근거를 검증해 추가하고 기존 콘텐츠·날짜를 보존한다", async () => {
  const before = structuredClone(current);
  const result = await automaticUpdate(current, [candidate], videos, dependencies, checkedAt);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.snapshot.foods.length, current.foods.length + 1);
  assert.deepEqual(result.snapshot.foods.slice(0, current.foods.length), current.foods);
  assert.deepEqual(current, before);
  const food = result.snapshot.foods.at(-1)!;
  assert.equal(food.image, "pending");
  assert.equal(food.kind, "recipe");
  assert.deepEqual(food.history?.years, [2026]);
  assert.equal(food.sources[0].url, "https://www.youtube.com/watch?v=Abcdef_1234");
  assert.match(food.recipeNote, /개별 검수/);
  assert.doesNotThrow(() => parseContent(result.snapshot));
  const again = await automaticUpdate(result.snapshot, [candidate], videos, dependencies, checkedAt);
  assert.equal(again.accepted.length, 0);
  assert.deepEqual(again.snapshot, result.snapshot);
});

test("자동 반영: AI가 실제 원문 인용에 없는 사용량·숫자·시간·출처를 내면 보류한다", () => {
  for (const patch of [
    { complete: false }, { sourceId: "wrong-source" }, { timeEvidence: "전체 조리 시간 20분", cookMinutes: 20 },
    { servings: "4인분" }, { ingredientEvidence: [] }, { stepEvidence: [] },
    { ingredients: [{ name: "면", amount: "999g" }, ...recipe.ingredients.slice(1)] },
    { steps: [{ text: "180도에서 구워요.", timerMinutes: 0 }, recipe.steps[1]] },
    { steps: [{ text: "면을 삶아요.", timerMinutes: 30 }, recipe.steps[1]] },
  ]) assert.throws(() => verifiedFood(candidate, videos, { ...recipe, ...patch }, checkedAt));
});

test("자동 반영: 상승 미확인·이미 게시한 음식에는 AI를 호출하지 않는다", async () => {
  let calls = 0;
  const result = await automaticUpdate(current, [
    { ...candidate, multiplier: 1.1, recent: true },
    { ...candidate, name: current.foods[0].name },
  ], videos, { ...dependencies, generate: async () => { calls++; return recipe; } }, checkedAt);
  assert.equal(calls, 0);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.snapshot, current);
});

test("자동 반영: 같은 제작자·오래된 영상·원문 없음·주소 충돌이면 기존 자료를 보존한다", async () => {
  for (const details of [videos.slice(0, 1), videos.map((video) => ({ ...video, channelId: "same" })), videos.map((video) => ({ ...video, publishedAt: "2026-10-01T01:00:00Z" }))]) {
    const result = await automaticUpdate(current, [candidate], videos, { ...dependencies, descriptions: async () => details }, checkedAt);
    assert.equal(result.accepted.length, 0);
    assert.equal(result.deferred.length, 1);
    assert.equal(result.snapshot, current);
  }
  for (const generated of [{ ...recipe, complete: false }, { ...recipe, slug: current.foods[0].slug }]) {
    const result = await automaticUpdate(current, [candidate], videos, { ...dependencies, generate: async () => generated }, checkedAt);
    assert.equal(result.accepted.length, 0);
    assert.equal(result.snapshot, current);
  }
});

test("자동 반영: 하루 실행당 최대 세 음식만 확인하고 API 한도 소진은 실패로 보고한다", async () => {
  const candidates = Array.from({ length: 5 }, (_, index) => ({ ...candidate, name: `새 음식 ${index}` }));
  let requests = 0;
  const result = await automaticUpdate(current, candidates, [], { ...dependencies, descriptions: async () => { requests++; return []; } }, checkedAt);
  assert.equal(requests, 3);
  assert.equal(result.deferred.length, 3);
  await assert.rejects(automaticUpdate(current, [candidate], videos, { ...dependencies, generate: async () => { throw new AiQuotaError("한도 소진"); } }, checkedAt), AiQuotaError);
});

test("설명란 수집은 공식 videos.list를 사용하고 삭제된 영상은 반환하지 않는다", async (context) => {
  context.mock.method(globalThis, "fetch", async (input: string | URL) => {
    const url = new URL(String(input));
    assert.equal(url.origin + url.pathname, "https://www.googleapis.com/youtube/v3/videos");
    assert.equal(url.searchParams.get("part"), "snippet");
    assert.equal(url.searchParams.get("id"), "Abcdef_1234,Bcdefg_1234");
    return Response.json({ items: [{ id: videos[0].id, snippet: videos[0] }, { id: videos[1].id, snippet: { title: videos[1].title } }] });
  });
  const result = await recipeDescriptions(["Abcdef_1234", "Abcdef_1234", "Bcdefg_1234", "sample-0"], "test-key");
  assert.equal(result.length, 2);
  assert.equal(result[0].description, description);
  assert.equal(result[1].description, "");
});
