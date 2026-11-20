import assert from "node:assert/strict";
import test from "node:test";
import { measurementId, safePage, track } from "../src/lib/analytics.ts";

test("방문 분석은 올바른 측정 ID만 받고 URL 검색어·해시를 제거한다", () => {
  assert.equal(measurementId("G-TEST123"), "G-TEST123");
  for (const value of [undefined, "", "UA-123", "G-X\"<script>"]) assert.equal(measurementId(value), null);
  assert.equal(safePage("/food/test?q=비밀#hash"), "/food/test");
  assert.doesNotThrow(() => track("search", { result_count: 0 }));
});
