import test from "node:test";
import assert from "node:assert/strict";
import { recentlyPublished } from "../src/data/freshness.ts";

test("최근 등록은 공개일만 사용하고 미확인·미래·30일 이전 날짜를 제외한다", () => {
  const today = "2026-11-20";
  for (const publishedAt of ["2026-11-20", "2026-10-22"]) assert.equal(recentlyPublished({ publishedAt }, today), true);
  for (const publishedAt of [undefined, "2026-10-21", "2026-11-21", "invalid"]) assert.equal(recentlyPublished({ publishedAt }, today), false);
});
