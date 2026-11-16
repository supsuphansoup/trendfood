import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { contentToRecords, mergeContent, parseContent, type ContentSnapshot } from "../../src/data/content.ts";
import { generatedImages } from "../../src/data/generated-images.ts";
import { refreshRecommendations } from "./recommendations.ts";
import type { Scored } from "./logic.ts";

const raw = JSON.parse(await readFile(new URL("../../src/data/content/foods.json", import.meta.url), "utf8"));
function baseline(): ContentSnapshot {
  const snapshot = structuredClone(raw);
  delete snapshot.recommendation;
  snapshot.foods.sort((a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug));
  return parseContent(snapshot);
}
const date = "2026-11-16";
const signal = (name: string, score = 3): Scored => ({ name, category: "간식", mentions: 2, multiplier: 2, trend: [1, 2, 3], score });

test("새 음식이 없는 날 대표와 추천을 순환하고 레시피 날짜·본문·링크를 보존한다", () => {
  const current = baseline();
  const result = refreshRecommendations(current, { baseline: current, signals: [], date });
  assert.equal(result.snapshot.foods[0].slug, current.foods[1].slug);
  assert.deepEqual(result.snapshot.recommendation, { date, basis: "rotation", newSlugs: [] });
  for (const food of result.snapshot.foods) {
    const original = current.foods.find((item) => item.slug === food.slug)!;
    assert.deepEqual(food, { ...original, checkedAt: original.checkedAt ?? current.checkedAt });
  }
  assert.equal(current.recommendation, undefined);
  assert.ok(contentToRecords(result.snapshot).every((food) => !food.editorial!.newlyAdded));
});

test("기존 수집 신호의 이름·별칭을 대조해 상승 음식부터 추천한다", () => {
  const current = baseline();
  const cookie = current.foods.find((food) => food.slug === "dubai-chewy-cookie") ?? current.foods.find((food) => food.name.includes("쫀득"))!;
  const other = current.foods.find((food) => food.slug !== cookie.slug && food.slug !== current.foods[0].slug)!;
  const result = refreshRecommendations(current, { baseline: current, signals: [signal(other.name, 2), signal("두쫀쿠", 5)], date });
  assert.equal(result.snapshot.foods[0].slug, cookie.slug);
  assert.equal(result.snapshot.foods[1].slug, other.slug);
  assert.equal(result.snapshot.recommendation!.basis, "trend");
});

test("미확인·잘못된 신호는 상승 추천으로 표시하지 않는다", () => {
  const current = baseline();
  for (const signals of [[signal("등록되지 않은 음식")], [{ ...signal(current.foods[1].name), multiplier: 1.1 }],
    [{ ...signal(current.foods[1].name), trend: [] }], [{ ...signal(current.foods[1].name), score: NaN }]]) {
    assert.equal(refreshRecommendations(current, { baseline: current, signals, date }).snapshot.recommendation!.basis, "rotation");
  }
});

test("어제 대표와 같은 상승 음식 하나뿐이면 기존 음식 순환으로 설명한다", () => {
  const current = baseline();
  const result = refreshRecommendations(current, { baseline: current, signals: [signal(current.foods[0].name)], date });
  assert.equal(result.snapshot.foods[0].slug, current.foods[1].slug);
  assert.equal(result.snapshot.recommendation!.basis, "rotation");
});

function incoming(current: ContentSnapshot, imageReady: boolean) {
  const source = current.foods.find((food) => !generatedImages[food.image])!;
  const food = { ...structuredClone(source), slug: "new-verified-food", name: "새로 검증한 음식", checkedAt: date,
    ...(imageReady ? {} : { image: "pending", heroImage: undefined }) };
  return mergeContent(current, { version: 1, status: "ready", checkedAt: date, foods: [food] });
}

test("사진까지 확보한 신규 음식은 앞에 배치하고 신규 표시를 분리한다", () => {
  const current = baseline();
  const result = refreshRecommendations(incoming(current, true), { baseline: current, signals: [], date });
  assert.equal(result.snapshot.foods[0].slug, "new-verified-food");
  assert.deepEqual(result.snapshot.recommendation, { date, basis: "new", newSlugs: ["new-verified-food"] });
  const records = contentToRecords(result.snapshot);
  assert.equal(records[0].editorial!.newlyAdded, true);
  assert.ok(records.slice(1).every((food) => !food.editorial!.newlyAdded));
  assert.ok(records.every((food) => food.likes === 0 && food.videos === 0 && food.multiplier === 0));
});

test("사진 없는 신규 음식만 보류하고 기존 추천·사진 변경은 반영한다", () => {
  const current = baseline();
  const staged = incoming(current, false);
  staged.foods[1].tip += " 확인한 조리 팁";
  const result = refreshRecommendations(staged, { baseline: current, signals: [], date });
  assert.equal(result.snapshot.foods.length, current.foods.length);
  assert.equal(result.snapshot.foods[0].tip, staged.foods[1].tip);
  assert.equal(result.deferred[0].slug, "new-verified-food");
  assert.equal(result.snapshot.recommendation!.basis, "rotation");
});

test("같은 날 재실행은 순서·신규 표시를 유지하고 다음 날에는 신규 표시를 해제한다", () => {
  const current = baseline();
  for (const staged of [current, incoming(current, true)]) {
    const first = refreshRecommendations(staged, { baseline: current, signals: [], date }).snapshot;
    const rerun = refreshRecommendations(first, { baseline: first, signals: [signal(first.foods.at(-1)!.name)], date }).snapshot;
    assert.deepEqual(rerun, first);
    assert.deepEqual(refreshRecommendations(first, { baseline: current, signals: [], date }).snapshot, first);
  }
  const yesterday = refreshRecommendations(incoming(current, true), { baseline: current, signals: [], date: "2026-11-15" }).snapshot;
  const next = refreshRecommendations(yesterday, { baseline: yesterday, signals: [], date }).snapshot;
  assert.deepEqual(next.recommendation!.newSlugs, []);
  assert.notEqual(next.foods[0].slug, yesterday.foods[0].slug);
  assert.throws(() => refreshRecommendations(next, { baseline: next, signals: [], date: "2026-11-15" }), /이전 날짜/);
});

test("추천 메타데이터는 잘못된 날짜·주소·근거·신규 표시를 거부한다", () => {
  const current = baseline();
  for (const recommendation of [
    { date: "2026-02-30", basis: "rotation", newSlugs: [] },
    { date, basis: "live", newSlugs: [] },
    { date, basis: "new", newSlugs: [] },
    { date, basis: "new", newSlugs: ["unknown"] },
    { date, basis: "rotation", newSlugs: [current.foods[0].slug] },
  ]) assert.throws(() => parseContent({ ...current, recommendation }), /추천 날짜/);
});

test("추천 반영 CLI는 API 키 없이 검증된 입력을 읽어 저장하고 보류 보고서를 남긴다", async () => {
  const current = baseline();
  const temporary = await mkdtemp(join(tmpdir(), "trendfood-recommendations-"));
  await mkdir(join(temporary, "src/data/content"), { recursive: true });
  await mkdir(join(temporary, "data"));
  await writeFile(join(temporary, "src/data/content/foods.json"), JSON.stringify(incoming(current, false)));
  await writeFile(join(temporary, "data/recommendation-input.json"), JSON.stringify({ baseline: current, signals: [], date }));
  const output = execFileSync(process.execPath, [fileURLToPath(new URL("../refresh-recommendations.ts", import.meta.url))],
    { cwd: temporary, env: { ...process.env, OPENAI_API_KEY: "", GEMINI_API_KEY: "" }, encoding: "utf8" });
  assert.match(output, /rotation/);
  const saved = parseContent(JSON.parse(await readFile(join(temporary, "src/data/content/foods.json"), "utf8")));
  assert.equal(saved.foods[0].slug, current.foods[1].slug);
  const report = JSON.parse(await readFile(join(temporary, "data/recommendation-report.json"), "utf8"));
  assert.equal(report.accepted.length, 0);
  assert.equal(report.deferred.length, 1);
});
