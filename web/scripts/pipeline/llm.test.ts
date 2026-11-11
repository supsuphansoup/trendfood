import assert from "node:assert/strict";
import { test } from "node:test";
import { draftPrompt } from "./llm.ts";

test("AI 초안 프롬프트: 네이버 배수·영상 제목은 유지하고 YouTube 수치는 금지", () => {
  const prompt = draftPrompt("버터떡", 4.2, ["버터떡 만들기"]);
  assert.ok(prompt.includes("근거 수치: 네이버 검색량이 최근 3일 동안 평소의 4.2배."));
  assert.ok(prompt.includes("영상 개수·조회수·구독자 수 같은 YouTube 수치는 글에 쓰지 마세요."));
  assert.ok(prompt.includes("- 버터떡 만들기"));
  assert.ok(!prompt.includes("개에 등장"));
});
