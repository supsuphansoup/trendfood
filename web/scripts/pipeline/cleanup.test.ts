import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanupOldYoutubeData } from "./cleanup.ts";

const now = new Date("2026-11-11T03:04:05.678Z");
const cutoff = "2026-10-13T03:04:05.678Z";
const makeRow = (id: string) => ({
  id,
  origin: "pipeline",
  created_at: cutoff,
  status: "대기",
  source: "영상 제목: 버터떡 만들기",
  note: "영상 3개 언급",
  signals: { multiplier: 2, trend: [1, 2], videos: 3, mentions: 3 } as Record<string, unknown>,
  score: 4.2 as number | null,
});

function fakeDb(rows: ReturnType<typeof makeRow>[], failure?: "select" | "update" | "throw") {
  const queries: unknown[] = [];
  const updates: unknown[] = [];
  const db = {
    from(table: string) {
      assert.equal(table, "candidates");
      return {
        select(columns: string) {
          const filters: Record<string, string> = {};
          const query = {
            eq(column: string, value: string) { filters[column] = value; return query; },
            lte(column: string, value: string) { filters[column] = value; return query; },
            order(column: string) { assert.equal(column, "id"); return query; },
            async range(from: number, to: number) {
              queries.push({ columns, filters, from, to });
              if (failure === "throw") throw new Error("연결 실패");
              return {
                data: rows.filter((row) => row.origin === filters.origin && row.created_at <= filters.created_at).slice(from, to + 1),
                error: failure === "select" ? { message: "조회 오류" } : null,
              };
            },
          };
          return query;
        },
        update(patch: unknown) {
          return {
            async eq(column: string, id: string) {
              assert.equal(column, "id");
              updates.push({ id, patch });
              return { error: failure === "update" ? { message: "수정 오류" } : null };
            },
          };
        },
      };
    },
  };
  return { db: db as unknown as SupabaseClient, queries, updates };
}

test("오래된 자동 수집값 정리: 조회 조건·날짜 경계·모든 상태·변경 행만 update", async () => {
  const rows = [
    ...["대기", "승인", "반려"].map((status, i) => ({ ...makeRow(String(i)), status })),
    { ...makeRow("clean"), source: "", note: "", signals: { multiplier: 2, trend: [1, 2] }, score: null },
    { ...makeRow("manual"), origin: "manual" },
    { ...makeRow("recent"), created_at: "2026-10-13T03:04:05.679Z" },
    { ...makeRow("older"), created_at: "2026-10-12T00:00:00.000Z", source: "https://example.com", note: "운영자 메모" },
  ];
  const before = structuredClone(rows);
  const fake = fakeDb(rows);
  assert.equal(await cleanupOldYoutubeData(fake.db, now), 4);
  assert.deepEqual(fake.queries, [{ columns: "id, source, note, signals, score", filters: { origin: "pipeline", created_at: cutoff }, from: 0, to: 999 }]);
  const patch = { source: "", note: "", signals: { multiplier: 2, trend: [1, 2] }, score: null };
  assert.deepEqual(fake.updates, [
    { id: "0", patch }, { id: "1", patch }, { id: "2", patch },
    { id: "older", patch: { signals: { multiplier: 2, trend: [1, 2] }, score: null } },
  ]);
  assert.deepEqual(rows, before);
});

test("오래된 자동 수집값 정리: 1000행 다음 페이지도 검사하고 변경 없으면 요청 생략", async () => {
  const clean = { ...makeRow("clean"), source: "", note: "", signals: {}, score: null };
  const fake = fakeDb([...Array.from({ length: 1000 }, (_, i) => ({ ...clean, id: String(i) })), makeRow("last")]);
  assert.equal(await cleanupOldYoutubeData(fake.db, now), 1);
  assert.equal(fake.queries.length, 2);
  assert.deepEqual(fake.queries[1], { columns: "id, source, note, signals, score", filters: { origin: "pipeline", created_at: cutoff }, from: 1000, to: 1999 });
  assert.equal(fake.updates.length, 1);
  assert.equal(await cleanupOldYoutubeData(fakeDb([clean]).db, now), 0);
  assert.equal(await cleanupOldYoutubeData(fakeDb([]).db, now), 0);
});

for (const [failure, message] of [["select", "조회 오류"], ["update", "수정 오류"], ["throw", "연결 실패"]] as const) {
  test(`오래된 자동 수집값 정리: ${message}를 한국어 오류로 전파`, async () => {
    const fake = fakeDb([makeRow("1")], failure);
    await assert.rejects(cleanupOldYoutubeData(fake.db, now), { message: `30일 지난 수집값 정리 실패: ${message}` });
    assert.equal(fake.updates.length, failure === "update" ? 1 : 0);
  });
}
