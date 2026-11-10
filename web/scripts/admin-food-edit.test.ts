import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSteps, ingredientChanges, moveItem, photoChanges } from "../src/data/admin-food-edit.ts";

test("조리법 정리: 공백 제거, 빈 타이머 키 생략, 타이머 경계값", () => {
  assert.deepEqual(cleanSteps([{ text: " 섞어요 ", timer: " " }, { text: "굽기", timer: " 1 " }, { text: "숙성", timer: "1440" }]).value,
    [{ text: "섞어요" }, { text: "굽기", timerMinutes: 1 }, { text: "숙성", timerMinutes: 1440 }]);
});

test("조리법 검증: 빈 목록·빈 단계·범위 밖 또는 정수가 아닌 타이머 거부", () => {
  assert.equal(cleanSteps([]).error, "조리 단계를 하나 이상 적어 주세요.");
  assert.equal(cleanSteps([{ text: "  ", timer: "" }]).error, "비어 있는 단계가 있어요. 내용을 적거나 삭제해 주세요.");
  for (const timer of ["0", "1441", "1.5", "-1", "abc", "1e2"]) {
    assert.equal(cleanSteps([{ text: "섞어요", timer }]).error, "타이머는 1~1440 사이의 분으로 적어 주세요.");
  }
});

test("재료 변경분: 삭제는 빠진 ID만, 기존 수정은 가격·링크를 포함하지 않고 순서를 0부터 부여", () => {
  const original = [{ id: 1, name: "가루", hard: true, pantry: false, position: 0, url: "https://link.coupang.com/a/test", price: 1000 }, { id: 2, name: "설탕", hard: false, pantry: true, position: 1 }];
  const before = structuredClone(original);
  assert.deepEqual(ingredientChanges(original, [{ name: " 우유 ", hard: false, pantry: true }, { ...original[0], name: "쌀가루" }]).value, {
    removed: [2], updated: [{ id: 1, patch: { name: "쌀가루", hard: true, pantry: false, position: 1 } }],
    added: [{ name: "우유", hard: false, pantry: true, position: 0 }],
  });
  assert.deepEqual(original, before);
});

test("재료 검증: 빈 목록·빈 이름·공백을 자른 뒤 같은 이름 거부", () => {
  const item = { name: " 설탕 ", hard: false, pantry: false };
  assert.equal(ingredientChanges([], []).error, "재료를 하나 이상 적어 주세요.");
  assert.equal(ingredientChanges([], [{ ...item, name: " " }]).error, "이름이 비어 있는 재료가 있어요.");
  assert.equal(ingredientChanges([], [item, { ...item, name: "설탕" }]).error, "같은 이름의 재료가 두 번 있어요: 설탕");
});

test("사진 변경분: 키 변경 때만 히어로 초기화, 빈 설명 거부", () => {
  assert.deepEqual(photoChanges("dubai", "bagel", " 베이글 ").value, { image: "bagel", alt: "베이글", hero_image: null, hero_alt: null });
  assert.deepEqual(photoChanges("dubai", "dubai", "초콜릿").value, { image: "dubai", alt: "초콜릿" });
  assert.equal(photoChanges("dubai", "bagel", " ").error, "사진 설명을 적어 주세요.");
});

test("순서 변경: 원본 유지, 위아래 이동과 경계에서 순서 보존", () => {
  const items = ["가", "나", "다"];
  assert.deepEqual(moveItem(items, 1, -1), ["나", "가", "다"]);
  assert.deepEqual(moveItem(items, 1, 1), ["가", "다", "나"]);
  assert.deepEqual(moveItem(items, 0, -1), items);
  assert.deepEqual(moveItem(items, 2, 1), items);
  assert.deepEqual(items, ["가", "나", "다"]);
});
