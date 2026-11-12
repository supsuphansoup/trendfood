import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseContent } from "../../src/data/content.ts";
import { automaticUpdate, verifiedFood } from "./autopublish.ts";
import { AiQuotaError } from "./llm.ts";
import type { Scored } from "./logic.ts";
import { recipeDescriptions, type RecipeVideo } from "./sources.ts";

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
    return Response.json({ items: [{ id: videos[0].id, snippet: videos[0] }] });
  });
  const result = await recipeDescriptions(["Abcdef_1234", "Abcdef_1234", "Bcdefg_1234", "sample-0"], "test-key");
  assert.equal(result.length, 1);
  assert.equal(result[0].description, description);
});
