import assert from "node:assert/strict";
import { test } from "node:test";
import { foodVideoId, parseYouTubeId } from "../src/data/youtube.ts";

test("공식 YouTube 영상 주소만 임베드 ID로 바꾼다", () => {
  assert.equal(parseYouTubeId("https://www.youtube.com/watch?v=9XA663UnbT8"), "9XA663UnbT8");
  assert.equal(parseYouTubeId("https://youtu.be/9XA663UnbT8?t=7"), "9XA663UnbT8");
  assert.equal(parseYouTubeId("https://www.youtube.com/shorts/9XA663UnbT8"), "9XA663UnbT8");
  assert.equal(parseYouTubeId("https://www.youtube.com.example.test/watch?v=9XA663UnbT8"), null);
  assert.equal(parseYouTubeId("https://www.youtube.com/@channel"), null);
});

test("운영자가 등록한 영상이 우선이고 등록 영상이 없으면 기존 출처를 사용한다", () => {
  const editorial = {
    checkedAt: "2026-11-23",
    recipeNote: "출처 확인",
    sources: [
      { title: "음식 소개", url: "https://example.test/food" },
      { title: "음식 영상", url: "https://www.youtube.com/watch?v=9XA663UnbT8" },
    ],
  };
  assert.equal(foodVideoId({ videoId: "trendfood01", editorial }), "trendfood01");
  assert.equal(foodVideoId({ videoId: null, editorial }), "9XA663UnbT8");
  assert.equal(foodVideoId({ videoId: null }), null);
});
