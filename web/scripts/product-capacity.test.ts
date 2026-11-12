import assert from "node:assert/strict";
import { test } from "node:test";
import { packageQuantity, recipeQuantity, suitableProducts } from "./product-capacity.ts";

test("필요량: 질량·부피·개수를 구분하고 분수·명시된 합계만 환산한다", () => {
  assert.deepEqual(recipeQuantity("약 0.4kg"), { unit: "g", value: 400 });
  assert.deepEqual(recipeQuantity("1/2컵(100ml)"), { unit: "ml", value: 100 });
  assert.deepEqual(recipeQuantity("반죽용 50g + 집청용 200g"), { unit: "g", value: 250 });
  assert.deepEqual(recipeQuantity("1/2개"), { unit: "count", value: 0.5 });
  assert.equal(recipeQuantity(undefined), null);
  assert.equal(recipeQuantity("1,200g"), null);
  for (const amount of ["약간", "1큰술", "300~400ml", "200-300g", "40g + 묻힐 양 약간", "7개(반죽 1개·토핑 6개)", "0g", "1/0개"]) assert.equal(recipeQuantity(amount), null, amount);
});

test("상품 포장: 단위 용량에 묶음 수를 곱하고 불명확한 옵션·업소용을 거절한다", () => {
  for (const title of ["버터 200g, 2개", "버터 200g x 2", "버터 2 x 200g"]) assert.deepEqual(packageQuantity(title), { unit: "g", value: 400 }, title);
  assert.deepEqual(packageQuantity("우유 0.5L, 2개"), { unit: "ml", value: 1000 });
  assert.deepEqual(packageQuantity("달걀 10구, 1개"), { unit: "count", value: 10 });
  assert.deepEqual(packageQuantity("볶은 카다이프 200g, 1개 - 혼합/기타잡곡 | 쿠팡"), { unit: "g", value: 200 });
  for (const title of ["초콜릿 5,200g", "초콜릿 100-200g"]) assert.equal(packageQuantity(title), null, title);
  for (const title of ["초콜릿", "초콜릿 100g / 500g", "초콜릿 100g+100g", "초콜릿 업소용 5kg", "초콜릿 대용량 1kg", "옵션 선택 초콜릿 200g", "초콜릿 3종 100g", "초콜릿 0g", "초콜릿 100g 10개입", "초콜릿 100g 0.5개"]) assert.equal(packageQuantity(title), null, title);
});

test("포장 선택: 필요량을 충족하는 최소 총량 우선, 부족·과대·단위 불일치는 보류한다", () => {
  const products = [5000, 500, 100, 200].map((g) => ({ id: g, name: `코팅 다크초콜릿 ${g}g, 1개`, url: `https://www.coupang.com/vp/products/${g}` }));
  assert.deepEqual(suitableProducts(products, "70g").map((product) => product.id), [100, 200, 500]);
  assert.deepEqual(suitableProducts(products, "400g").map((product) => product.id), [500]);
  assert.deepEqual(suitableProducts(products, "700g"), []);
  assert.deepEqual(suitableProducts(products, "70ml"), []);
  assert.deepEqual(suitableProducts(products, "약간"), []);
  assert.deepEqual(suitableProducts([{ id: 1, name: "초콜릿 200g, 6개", url: "" }], "70g"), []);
});
