import assert from "node:assert/strict";
import test from "node:test";
import { trendHistory } from "../src/data/trend-history.ts";

test("유행 음식 자료는 2010~2025년을 빠짐없이 포함하고 출처를 가진다", () => {
  assert.deepEqual([...new Set(trendHistory.map((item) => item.year))], Array.from({ length: 16 }, (_, index) => 2010 + index));
  assert.equal(new Set(trendHistory.map((item) => `${item.year}:${item.name}`)).size, trendHistory.length);
  for (const item of trendHistory) {
    assert.equal(new URL(item.url).protocol, "https:");
    assert.ok(item.name && item.summary && item.source);
  }
});
