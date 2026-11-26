import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { recipeJson, safeJson } from "../src/data/seo.ts";
import { seedFoods } from "../src/data/seed-foods.ts";

test("구조화 정보는 실제 레시피에만 실제 수량·시간·단계·공개일을 넣는다", () => {
  const food = seedFoods[0];
  const value = recipeJson(food, "/food.webp")!;
  assert.equal(value["@type"], "Recipe");
  assert.equal(value.recipeInstructions.length, food.steps.length);
  assert.equal(value.image?.[0], "https://vviralfood.com/food.webp");
  assert.equal("aggregateRating" in value, false);
  assert.equal("datePublished" in value, false);
  assert.equal(value.totalTime, undefined, "별도 굳히기 시간이 있는 레시피의 전체 시간을 조리 시간으로 꾸미지 않는다");
  assert.equal(recipeJson({ ...food, kind: "product" }), null);
  assert.equal(recipeJson({ ...food, kind: "discovery" }), null);
  assert.equal(safeJson({ name: "</script><script>" }).includes("<"), false);
});

test("검색 서비스 소유확인 주소는 원본 HTML을 직접 제공하도록 설정한다", () => {
  const files = {
    naver: "naverb5eb1dae2d757cd736e55ac238e25752.html",
    google: "google5d63792eef54147b.html",
  };
  const redirects = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8").split(/\r?\n/);

  for (const [service, filename] of Object.entries(files)) {
    const file = readFileSync(new URL(`../public/${filename}`, import.meta.url), "utf8");
    assert.equal(file.trim(), `${service}-site-verification: ${filename}`);
    assert.ok(redirects.includes(`/${filename} /${filename.slice(0, -5)} 200`));
  }
});
