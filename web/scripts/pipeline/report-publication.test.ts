import assert from "node:assert/strict";
import { test } from "node:test";
import { publicationSummary } from "./report-publication.ts";

test("관리자 자동 수집 집계는 원문 검증과 사진 미확보만 각 보고서에서 센다", () => {
  assert.deepEqual(publicationSummary({ accepted: [{ name: "검증된 원고" }] }, {
    date: "2026-11-26",
    deferred: [{ reason: "게시 가능한 음식 사진 미확보" }, { reason: "오늘 공개 상한 도달" }],
  }), { date: "2026-11-26", verified: 1, photoWaiting: 1 });
});
