import assert from "node:assert/strict";
import { test } from "node:test";
import { applyContentEdits, editedContentRecords, orderContent, parseContentEdits } from "../src/data/content-edits.ts";
import { parseContent } from "../src/data/content.ts";
import { foodVideoId } from "../src/data/youtube.ts";
import content from "../src/data/content/foods.json" with { type: "json" };

const snapshot = parseContent(content);
const [first, second, third] = snapshot.foods;

test("공개 원본에 수정 필드만 적용하고 다음 수집에서 갱신된 출처와 재료를 보존한다", () => {
  const edits = parseContentEdits({ foods: { [first.slug]: { name: "편집된 음식" } } });
  const fresh = { ...first, summary: "자동 수집이 갱신한 설명" };
  const result = editedContentRecords({ ...snapshot, foods: [fresh, ...snapshot.foods.slice(1)] }, edits);
  assert.equal(result.length, snapshot.foods.length);
  assert.equal(result[0].name, "편집된 음식");
  assert.equal(result[0].summary, fresh.summary);
  assert.deepEqual(result[0].editorial?.sources, first.sources);
  assert.deepEqual(result[0].history, first.history);
  assert.deepEqual(result[0].ingredients, first.ingredients);
});

test("숨김·초안은 공개 목록만 빼고 순위를 다시 매긴다. 복구하면 같은 주소로 돌아온다", () => {
  const edits = parseContentEdits({ foods: { [first.slug]: { hidden: true }, [second.slug]: { draft: true } } });
  assert.equal(applyContentEdits(snapshot, edits).foods.length, snapshot.foods.length);
  const result = editedContentRecords(snapshot, edits);
  assert.equal(result.length, snapshot.foods.length - 2);
  assert.equal(result[0].slug, third.slug);
  assert.equal(result[0].rank, 1);
  assert.ok(editedContentRecords(snapshot, { foods: { [first.slug]: { hidden: false } } }).some((food) => food.slug === first.slug));
  assert.throws(() => editedContentRecords(snapshot, {
    foods: Object.fromEntries(snapshot.foods.map((food) => [food.slug, { hidden: true }])),
  }), /하나 이상/);
});

test("관리자가 옮긴 주소만 순서를 바꾸고 신규 음식 자리는 유지한다", () => {
  assert.deepEqual(orderContent([first, third, second], [second.slug, first.slug]), [second, third, first]);
});

test("재료 링크는 지정한 재료에만 적용하고 출처 링크는 영상 숨김 뒤에도 보존한다", () => {
  const recipe = { ...first, sources: [...first.sources, { title: "원본 영상", url: "https://youtu.be/abcdefghijk" }] };
  const [ingredient, other] = recipe.ingredients;
  const source = { ...snapshot, foods: [recipe, ...snapshot.foods.slice(1)] };
  const result = editedContentRecords(source, parseContentEdits({ foods: {
    [recipe.slug]: { ingredientLinks: { [ingredient.name]: "https://link.coupang.com/a/example" }, videoId: null },
  } })).find((food) => food.slug === recipe.slug)!;
  assert.equal(result.ingredients[0].url, "https://link.coupang.com/a/example");
  assert.deepEqual(result.ingredients[1], other);
  assert.equal(foodVideoId(result), null);
  assert.deepEqual(result.editorial?.sources, recipe.sources);
});

test("대표 사진을 바꾸면 이전 큰 사진을 비우고 등록된 업로드만 허용한다", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const source = { ...snapshot, foods: [{ ...first, heroImage: first.image, heroAlt: first.alt }, ...snapshot.foods.slice(1)] };
  const edits = parseContentEdits({ foods: { [first.slug]: { image: id, alt: "새로 올린 사진" } } });
  assert.throws(() => editedContentRecords(source, edits), /등록된 사진/);
  const changed = editedContentRecords(source, edits, [id])[0];
  assert.equal(changed.image, id);
  assert.equal(changed.heroImage, undefined);
  assert.equal(changed.heroAlt, undefined);
  assert.throws(() => parseContentEdits({ foods: { [first.slug]: { sources: [] } } }), /형식|잘못/);
});
