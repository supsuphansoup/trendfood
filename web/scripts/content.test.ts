import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { contentToRecords, mergeContent, parseContent } from "../src/data/content.ts";
import { draftSnapshot } from "./pipeline/content.ts";
import { photoCredits } from "../src/data/photo-credits.ts";

const target = new URL("../src/data/content/foods.json", import.meta.url);
const input = JSON.parse(await readFile(target, "utf8"));
const fresh = () => structuredClone(input);

test("공개 음식은 기존 30개 이상이며 출처·사용량·안내가 있고 실측 지표를 만들지 않는다", () => {
  const foods = contentToRecords(parseContent(input));
  assert.ok(foods.length >= 30);
  for (const food of foods) {
    assert.ok(food.editorial?.sources.length);
    assert.ok(food.ingredients.every((i) => i.amount && i.price === undefined));
    assert.ok(food.steps.length);
    assert.deepEqual(food.trend, []);
    assert.equal(food.likes, 0);
    assert.equal(food.multiplier, 0);
  }
});

test("기존 열 개 주소를 보존하고 2020~2026년 모두 근거 있는 유행 음식을 제공한다", () => {
  const { foods } = parseContent(input);
  for (const slug of ["dubai-chocolate", "chicken-mayo-deopbap", "shrimp-rose-tteokbokki", "airfryer-gyeranppang", "shrimp-cream-risotto", "tuna-gimbap", "butter-garaetteok", "perilla-makguksu", "green-onion-bagel", "egg-green-onion-ramyeon"]) {
    assert.ok(foods.some((food) => food.slug === slug), slug);
  }
  for (let year = 2020; year <= 2026; year++) {
    assert.ok(foods.filter((food) => food.history?.years.includes(year)).length >= 2, `${year}년 대표 음식`);
  }
  assert.equal(foods.find((food) => food.slug === "chicken-mayo-deopbap")?.history, undefined);
  assert.deepEqual(foods.filter((food) => food.kind === "product").map((food) => food.slug).sort(), ["meoktaekkang", "pokemon-bread", "yonsei-cream-bread"]);
});

test("확보한 사진은 CC0·퍼블릭 도메인 출처와 파일을 보존하고 나머지는 준비 중이다", async () => {
  const { foods } = parseContent(input);
  assert.ok(foods.filter((food) => food.image === "pending").length >= 20);
  for (const food of foods.filter((food) => food.image !== "pending")) {
    const credit = photoCredits[food.image];
    assert.ok(credit.author && credit.note && credit.verifiedAt);
    assert.ok(["CC0", "Public domain"].includes(credit.license));
    assert.equal(new URL(credit.url).hostname, "commons.wikimedia.org");
    const bytes = await readFile(new URL(`../src/assets/curated/${food.image}.webp`, import.meta.url));
    assert.ok(bytes.length > 1000);
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
  }
});

test("근거 없는 연도·잘못된 유형·기존 데모 사진을 공개하지 않는다", () => {
  for (const history of [
    { years: [2019], note: "유행", sources: input.foods[0].sources },
    { years: [2099], note: "유행", sources: input.foods[0].sources },
    { years: [2020, 2020], note: "유행", sources: input.foods[0].sources },
    { years: [2020], note: "유행", sources: [] },
    { years: [2020], note: "", sources: input.foods[0].sources },
  ]) {
    const snapshot = fresh();
    snapshot.foods[0].history = history;
    assert.throws(() => parseContent(snapshot), /유행 연도/);
  }
  for (const patch of [{ kind: "unknown" }, { image: "dubai" }, { heroImage: "deopbap" }]) {
    const snapshot = fresh();
    Object.assign(snapshot.foods[0], patch);
    assert.throws(() => parseContent(snapshot), /콘텐츠 검증 실패/);
  }
});

test("빈 파일·초안·중복 주소·미래/잘못된 날짜를 공개하지 않는다", () => {
  for (const edit of [
    (s: typeof input) => { s.foods = []; },
    (s: typeof input) => { s.status = "draft"; },
    (s: typeof input) => { s.foods[1].slug = s.foods[0].slug; },
    (s: typeof input) => { s.checkedAt = "2026-02-30"; },
    (s: typeof input) => { s.checkedAt = "2099-01-01"; },
  ]) {
    const snapshot = fresh();
    edit(snapshot);
    assert.throws(() => parseContent(snapshot), /콘텐츠 검증 실패/);
  }
});

test("출처·재료 사용량·단계 없는 항목, 잘못된 링크·수치·사진은 거절한다", () => {
  for (const edit of [
    (f: typeof input.foods[0]) => { f.sources = []; },
    (f: typeof input.foods[0]) => { f.sources[0].url = "javascript:alert(1)"; },
    (f: typeof input.foods[0]) => { f.ingredients[0].amount = ""; },
    (f: typeof input.foods[0]) => { f.ingredients[0].price = 1200; },
    (f: typeof input.foods[0]) => { f.ingredients[0].url = "https://coupang.com.evil.example/x"; },
    (f: typeof input.foods[0]) => { f.steps = []; },
    (f: typeof input.foods[0]) => { f.steps[0].timerMinutes = -1; },
    (f: typeof input.foods[0]) => { f.cookMinutes = 0; },
    (f: typeof input.foods[0]) => { f.image = "missing-image"; },
  ]) {
    const snapshot = fresh();
    edit(snapshot.foods[0]);
    assert.throws(() => parseContent(snapshot), /콘텐츠 검증 실패/);
  }
});

test("수집 초안은 실제 YouTube 출처만 포함하고 승인 전 반영을 거절한다", () => {
  const f = input.foods[0];
  const draft = { ...f, steps: [{ text: "반죽을 섞어요", timerMinutes: 0 }] };
  const snapshot = draftSnapshot([
    { name: f.name, category: f.category, draft, sources: [{ id: "Abcdef_1234", title: "실제 형식의 영상 제목" }] },
    { name: "예시", category: "간식", draft, sources: [{ id: "sample-0", title: "예시 제목" }] },
    { name: "초안 없음", category: "밥", draft: null, sources: [] },
  ], input.checkedAt);
  assert.equal(snapshot.foods.length, 1);
  assert.equal(snapshot.status, "draft");
  assert.equal(snapshot.foods[0].sources[0].url, "https://www.youtube.com/watch?v=Abcdef_1234");
  assert.equal(snapshot.foods[0].steps[0].timerMinutes, undefined);
  assert.throws(() => parseContent(snapshot), /ready/);
  assert.doesNotThrow(() => parseContent(snapshot, true));
});

test("가져오기 실패 시 현재 페이지 콘텐츠 파일을 보존한다", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "trendfood-content-"));
  try {
    const path = join(temporary, "broken.json");
    const before = await readFile(target, "utf8");
    await writeFile(path, JSON.stringify({ ...input, foods: [] }));
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./content.ts", import.meta.url)), "import", path], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /음식은 1~1000개/);
    assert.equal(await readFile(target, "utf8"), before);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("새 수집 결과는 기존 레시피·출처 확인 날짜를 보존하며 같은 주소만 갱신한다", () => {
  const previous = parseContent(fresh());
  previous.checkedAt = "2026-11-01";
  for (const food of previous.foods) delete food.checkedAt;
  const current = parseContent(previous);
  const incoming = parseContent({ ...fresh(), foods: [
    { ...input.foods[0], why: "갱신한 소개" },
    { ...input.foods[1], slug: "new-butter-recipe" },
  ] });
  const merged = mergeContent(current, incoming);
  const foods = contentToRecords(merged);
  assert.equal(foods.length, input.foods.length + 1);
  assert.equal(foods[0].why, "갱신한 소개");
  assert.equal(foods[0].editorial?.checkedAt, input.checkedAt);
  assert.equal(foods[1].editorial?.checkedAt, "2026-11-01");
  assert.equal(foods.at(-1)?.slug, "new-butter-recipe");
  assert.equal(current.foods.length, input.foods.length);
  assert.notEqual(current.foods[0].why, "갱신한 소개");
});

test("API 키가 없으면 예시 데이터를 페이지 초안으로 내보내지 않는다", () => {
  const result = spawnSync(process.execPath, ["scripts/pipeline/run.ts", "--dry-run", "--output", "data/should-not-exist.json"], {
    encoding: "utf8",
    env: { ...process.env, YOUTUBE_API_KEY: "", NAVER_API_HUB_KEY_ID: "", NAVER_API_HUB_KEY: "", OPENAI_API_KEY: "", GEMINI_API_KEY: "", AI_MODEL: "" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /예시 데이터는 저장·내보내지 않아요/);
});
