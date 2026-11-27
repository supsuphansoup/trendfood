import assert from "node:assert/strict";
import test from "node:test";
import { formatCookDuration, formatCookLabel } from "../src/data/cook-duration.ts";

test("조리 시간은 정수 시간과 분으로 표시하고 0분인 나머지는 생략한다", () => {
  assert.deepEqual(
    [0, 15, 59, 60, 70, 119, 180, 1440].map(formatCookDuration),
    ["0분", "15분", "59분", "1시간", "1시간 10분", "1시간 59분", "3시간", "24시간"],
  );
});

test("단일 조리 시간 문구를 바꾸고 준비 과정이 적힌 안내는 보존한다", () => {
  assert.equal(formatCookLabel("예상 180분"), "예상 3시간");
  assert.equal(formatCookLabel("조리 95분"), "조리 1시간 35분");
  assert.equal(formatCookLabel("약 1.5시간"), "약 1시간 30분");
  assert.equal(formatCookLabel("조리 40분, 굳히기 1시간"), "조리 40분, 굳히기 1시간");
  assert.equal(formatCookLabel("음식 소개"), "음식 소개");
});
