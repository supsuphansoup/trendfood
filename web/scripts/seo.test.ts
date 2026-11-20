import assert from "node:assert/strict";
import test from "node:test";
import { recipeJson, safeJson } from "../src/data/seo.ts";
import { seedFoods } from "../src/data/seed-foods.ts";

test("구조화 정보는 실제 레시피에만 실제 수량·시간·단계·공개일을 넣는다", () => {
  const food = seedFoods[0];
  const value = recipeJson(food, "/food.webp")!;
  assert.equal(value["@type"], "Recipe");
  assert.equal(value.recipeInstructions.length, food.steps.length);
  assert.equal(value.image?.[0], "https://trendfood.pages.dev/food.webp");
  assert.equal("aggregateRating" in value, false);
  assert.equal("datePublished" in value, false);
  assert.equal(value.totalTime, undefined, "별도 굳히기 시간이 있는 레시피의 전체 시간을 조리 시간으로 꾸미지 않는다");
  assert.equal(recipeJson({ ...food, kind: "product" }), null);
  assert.equal(recipeJson({ ...food, kind: "discovery" }), null);
  assert.equal(safeJson({ name: "</script><script>" }).includes("<"), false);
});
