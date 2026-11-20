import assert from "node:assert/strict";
import test from "node:test";
import { ingredientName, ingredientOwned, pantryMatch, scaleAmount, scaledIngredients, servingLabel } from "../src/data/recipe-tools.ts";

test("보유 재료는 정확한 이름·기본 양념의 구매 선택을 적용하며 제품은 제외한다", () => {
  const food = { ingredients: [{ name: "버터 200g" }, { name: "간장" }, { name: "소금", pantry: true }] };
  assert.equal(ingredientName("버터 200g"), "버터");
  assert.deepEqual(pantryMatch(food, ["버터", "진간장"], ["소금"]), { have: 1, total: 3, missing: food.ingredients.slice(1) });
  assert.equal(pantryMatch({ ...food, kind: "product" }, [], []), null);
  assert.equal(pantryMatch({ ingredients: [] }, [], []), null);
  assert.equal(ingredientOwned({ name: "고추장" }, ["고추장"], []), true);
  assert.equal(ingredientOwned({ name: "고추장", pantry: true }, [], ["고추장"]), false);
  assert.equal(ingredientOwned({ name: "고추장", pantry: true }, ["고추장"], ["고추장"]), false);
});

test("분량은 단일 수량·범위·분수를 계산하고 복합 원문과 구매 정보는 보존한다", () => {
  for (const [amount, expected] of [["200g", "100g"], ["1/2큰술", "0.25큰술"], ["약 1~2개", "약 0.5~1개"], ["1.5L", "0.75L"]]) assert.equal(scaleAmount(amount, 0.5).text, expected);
  for (const amount of ["취향껏", "1개(200g)", "200g + 50g", "한 줌", "1/0개"]) assert.deepEqual(scaleAmount(amount, 2), { text: amount, scaled: false });
  assert.equal(scaleAmount("1개", -1).text, "1개");
  assert.equal(scaleAmount("0.00001g", 0.5).text, "0.00001g");
  const ingredients = [{ name: "버터 200g", amount: "100g", url: "https://example.com/product" }];
  assert.deepEqual(scaledIngredients(ingredients, 2), [{ ...ingredients[0], amount: "200g" }]);
  assert.equal(ingredients[0].amount, "100g");
  assert.equal(servingLabel("2인분", 0.5), "1인분");
  assert.equal(servingLabel("약 18개", 2), "2배 분량");
});
