import assert from "node:assert/strict";
import { test } from "node:test";
import { draftToRows, normalizeName, weekOf } from "../../src/data/candidates.ts";
import { cleanExtracted, pickCandidates, risingMultiplier, scaleTrend, scoreOf } from "./logic.ts";

test("급상승 배수: 최근 3일 평균 ÷ 앞 기간 평균", () => {
  assert.equal(risingMultiplier([10, 10, 10, 10, 30, 30, 30]), 3);
  assert.equal(risingMultiplier([0, 0, 0, 5, 5, 5]), 5);
  assert.equal(risingMultiplier([0, 0, 0, 0]), 1);
  assert.equal(risingMultiplier([5, 5]), 1);
});

test("그래프 값은 최댓값을 100으로", () => {
  assert.deepEqual(scaleTrend([1, 2, 4]), [25, 50, 100]);
  assert.deepEqual(scaleTrend([0, 0]), [0, 0]);
});

test("LLM 결과 정리: 이상한 값·중복·잘못된 카테고리 처리", () => {
  const out = cleanExtracted({
    foods: [
      { name: "두바이 쫀득쿠키", category: "디저트", mentions: 4 },
      { name: "두바이쫀득쿠키", category: "디저트", mentions: 2 },
      { name: "a", category: "밥" },
      { name: "버터떡", category: "음료", mentions: "x" },
      "엉뚱한 값",
    ],
  });
  assert.deepEqual(out, [
    { name: "두바이 쫀득쿠키", category: "디저트", mentions: 4 },
    { name: "버터떡", category: "간식", mentions: 1 },
  ]);
  assert.deepEqual(cleanExtracted(null), []);
});

test("후보 고르기: 이미 있는 음식·낮은 배수 제외, 점수순", () => {
  const mk = (name: string, multiplier: number, mentions = 1) => ({
    name,
    category: "간식" as const,
    mentions,
    multiplier,
    trend: [],
    score: scoreOf(multiplier, mentions),
  });
  const picked = pickCandidates([mk("버터떡", 2), mk("두바이 초콜릿", 5), mk("약과", 1.1), mk("탕후루", 1.8, 8)], ["두바이초콜릿"]);
  assert.deepEqual(picked.map((p) => p.name), ["탕후루", "버터떡"]);
});

test("이름 비교·주 시작일", () => {
  assert.equal(normalizeName(" 로제 떡볶이 "), "로제떡볶이");
  assert.equal(weekOf(new Date("2026-11-05T03:00:00Z")), "2026-11-02");
  assert.equal(weekOf(new Date("2026-11-02T00:00:00Z")), "2026-11-02");
});

test("승인 초안 → foods 행: 주소 검사·길이 자르기·재료 중복 제거", () => {
  const base = { name: "버터떡", category: "간식", signals: { multiplier: 2.345, trend: [1, 2], videos: 3 } };
  assert.equal(draftToRows({ ...base, draft: null }), null);
  assert.equal(draftToRows({ ...base, draft: { slug: "버터떡" } }), null);
  const rows = draftToRows({
    ...base,
    draft: {
      slug: "butter-tteok",
      why: "x".repeat(300),
      cookMinutes: 0,
      ingredients: [{ name: "찹쌀가루" }, { name: "찹쌀가루" }, { name: "버터", pantry: true }],
    },
  });
  assert.ok(rows);
  assert.equal(rows.food.status, "draft");
  assert.equal(rows.food.why.length, 200);
  assert.equal(rows.food.cook_minutes, 1);
  assert.equal(rows.food.multiplier, 2.35);
  assert.equal(rows.food.videos, 3);
  assert.deepEqual(rows.ingredients.map((i) => [i.position, i.name, i.pantry]), [
    [0, "찹쌀가루", false],
    [1, "버터", true],
  ]);
});
