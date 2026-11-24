import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { contentToRecords, mergeContent, parseContent, type ContentSnapshot } from "../../src/data/content.ts";
import { generatedImages } from "../../src/data/generated-images.ts";
import { publishPendingPhotos, refreshRecommendations } from "./recommendations.ts";
import { emptyDiscovery } from "./discovery.ts";
import type { Scored } from "./logic.ts";
import { publicationCandidates, publicationDate, publicationSlots } from "./publish-policy.ts";

const raw = JSON.parse(await readFile(new URL("../../src/data/content/foods.json", import.meta.url), "utf8"));

test("사진 대기 원고는 등록한 같은 음식의 생성 사진과 최근 두 제작자·원문 재확인이 있어야 공개한다", async () => {
  const date = "2026-11-20";
  const current = baseline();
  current.foods = current.foods.filter((food) => food.slug !== "yogurt-mochi");
  const ids = ["Abcdef_1230", "Abcdef_1231"];
  const draft = { ...current.foods[0], slug: "yogurt-mochi", name: "요거트 찹쌀떡", kind: "discovery" as const,
    image: "pending", heroImage: "pending", ingredients: [], steps: [], cookMinutes: 0,
    summary: "원문 소개: “요거트 찹쌀떡 먹방”", sources: ids.map((id) => ({ title: "요거트 찹쌀떡 먹방", url: `https://www.youtube.com/watch?v=${id}` })) };
  const state = { ...emptyDiscovery(), pending: [{ food: draft, savedAt: date }] };
  const details = ids.map((id, index) => ({ id, title: "요거트 찹쌀떡 먹방", description: "", channelId: `UC${String(index).repeat(22)}`, publishedAt: "2026-11-19T00:00:00Z" }));
  const result = await publishPendingPhotos(current, state, date, async (requested) => { assert.deepEqual(requested, ids); return details; });
  const published = result.snapshot.foods.find((food) => food.slug === draft.slug)!;
  assert.equal(published.image, "photo-ai-yogurt-mochi");
  assert.equal(published.heroImage, published.image);
  assert.match(published.alt, /AI 생성/);
  assert.match(published.heroAlt!, /AI 생성/);
  assert.equal(published.publishedAt, date);
  assert.deepEqual(result.accepted, [{ name: draft.name, slug: draft.slug }]);
  assert.equal(state.pending.length, 1);
  for (const invalid of [details.slice(0, 1), details.map((item) => ({ ...item, title: "다른 음식" })), details.map((item) => ({ ...item, publishedAt: "2026-10-01T00:00:00Z" }))]) {
    const blocked = await publishPendingPhotos(current, state, date, async () => invalid);
    assert.equal(blocked.snapshot.foods.some((food) => food.slug === draft.slug), false);
    assert.equal(blocked.deferred[0].reason, "최근 제작자·원문 근거 재확인 미통과");
  }
  const repeated = await publishPendingPhotos(result.snapshot, state, date, async () => { throw new Error("이미 공개한 음식은 조회하지 않음"); });
  assert.equal(repeated.accepted.length, 0);
  assert.equal(repeated.snapshot.foods.filter((food) => food.slug === draft.slug).length, 1);
});

test("생성 사진을 등록하지 않은 원고는 외부 조회 없이 보류하고 기존 실사 사진은 보존한다", async () => {
  const current = baseline();
  current.foods = current.foods.filter((food) => food.slug !== "yogurt-mochi");
  const original = current.foods[0];
  const draft = { ...original, slug: "unregistered-photo-draft", image: "pending" };
  const result = await publishPendingPhotos(current, { ...emptyDiscovery(), pending: [{ food: draft, savedAt: "2026-11-20" }] }, "2026-11-20", async () => { throw new Error("조회 금지"); });
  assert.equal(result.accepted.length, 0);
  assert.equal(result.deferred[0].reason, "등록한 생성 예시 사진 없음");
  const registered = { ...original, slug: "yogurt-mochi", heroImage: original.image };
  const preserved = refreshRecommendations({ ...current, foods: [...current.foods, registered] }, { baseline: current, signals: [], date: "2026-11-20" }).snapshot.foods.find((food) => food.slug === registered.slug)!;
  assert.equal(preserved.image, original.image);
  assert.equal(preserved.heroImage, original.image);
});

test("대기 전용 실행도 새로 재확인한 영상 언급 점수로 상위 세 개를 게시한다", async () => {
  const current = baseline();
  const records = [...new Set(Object.values(generatedImages).map((image) => image.slug))].slice(0, 4);
  current.foods = current.foods.filter((food) => !records.includes(food.slug));
  const details: { id: string; title: string; description: string; channelId: string; publishedAt: string }[] = [];
  const pending = records.map((slug, index) => {
    const name = `대기 음식 ${index}`;
    const videos = Array.from({ length: index + 2 }, (_, video) => ({ id: `Abcdef_${index}${String(video).padStart(3, "0")}`, title: `${name} 먹방`, description: "",
      channelId: `UC${String(video).repeat(22)}`, publishedAt: "2026-11-19T00:00:00Z" }));
    details.push(...videos);
    return { savedAt: "2026-11-19", food: { ...current.foods[0], slug, name, kind: "discovery" as const, publishedAt: undefined,
      image: "pending", heroImage: "pending", ingredients: [], steps: [], cookMinutes: 0, checkedAt: "2026-11-19",
      summary: `원문 소개: “${videos[0].title}”`, sources: videos.map((video) => ({ title: video.title, url: `https://www.youtube.com/watch?v=${video.id}` })) } };
  });
  const result = await publishPendingPhotos(current, { ...emptyDiscovery(), pending }, "2026-11-20", async () => details);
  assert.deepEqual(result.snapshot.recommendation!.newSlugs, pending.slice(1).reverse().map(({ food }) => food.slug));
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].slug, pending[0].food.slug);
});

test("사진 대기 전용 실행은 음식·사진·상품 AI 호출을 모두 건너뛰고 YouTube 키만 연결한다", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/pipeline.yml", import.meta.url), "utf8");
  const steps = workflow.split(/\n      - /);
  for (const command of ["npm run pipeline", "npm run photos:auto", "npm run links:auto", "npm run links:auto -- --web-products"]) {
    const step = steps.find((step) => step.split(/\r?\n/).some((line) => line.trim() === `run: ${command}`) || step.startsWith(`run: ${command}\n`) || step.startsWith(`run: ${command}\r\n`));
    assert.ok(step, command);
    assert.match(step, /inputs\.pending_only != true/, command);
  }
  const restore = steps.find((step) => step.includes("run: node scripts/restore-pending-photos.ts"))!;
  assert.match(restore, /inputs\.pending_only == true/);
  assert.match(restore, /YOUTUBE_API_KEY:/);
  assert.doesNotMatch(restore, /OPENAI_API_KEY|GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
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

test("조리법 없는 새 음식도 사진 확보 후 앞에 배치하고 사진이 없으면 공개에서 보류한다", () => {
  const current = baseline();
  for (const imageReady of [false, true]) {
    const snapshot = incoming(current, imageReady);
    Object.assign(snapshot.foods.at(-1)!, { kind: "discovery", cookMinutes: 0, ingredients: [], steps: [] });
    const result = refreshRecommendations(parseContent(snapshot), { baseline: current, signals: [], date });
    assert.equal(result.snapshot.foods.some((food) => food.slug === "new-verified-food"), imageReady);
    if (imageReady) {
      assert.equal(result.snapshot.foods[0].kind, "discovery");
      assert.equal(result.snapshot.recommendation!.basis, "new");
      assert.deepEqual(contentToRecords(result.snapshot)[0].ingredients, []);
    } else assert.equal(result.deferred.length, 1);
  }
});

test("사진까지 확보한 신규 음식은 앞에 배치하고 신규 표시를 분리한다", () => {
  const current = baseline();
  const result = refreshRecommendations(incoming(current, true), { baseline: current, signals: [], date });
  assert.equal(result.snapshot.foods[0].publishedAt, date);
  assert.ok(result.snapshot.foods.slice(1).every((food) => food.publishedAt === current.foods.find((old) => old.slug === food.slug)?.publishedAt));
  const next = refreshRecommendations(result.snapshot, { baseline: result.snapshot, signals: [], date: "2026-11-17" });
  assert.equal(next.snapshot.foods.find((food) => food.slug === "new-verified-food")?.publishedAt, date);
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

test("복원 원고와 신규 원고가 섞여도 하루 세 개만 게시하고 같은 날 재실행에서 초과하지 않는다", () => {
  const current = baseline();
  const source = current.foods.find((food) => !generatedImages[food.image] && !generatedImages[food.heroImage ?? ""])!;
  const drafts = Array.from({ length: 6 }, (_, index) => ({ ...structuredClone(source), slug: `daily-food-${index}`, name: `신규 검증 음식 ${index}`,
    publishedAt: undefined, checkedAt: index < 3 ? "2026-11-15" : date }));
  const staged = { ...current, foods: [...current.foods, ...drafts] };
  const first = refreshRecommendations(staged, { baseline: current, signals: [], date });
  assert.deepEqual(first.snapshot.recommendation!.newSlugs, drafts.slice(3).map((food) => food.slug));
  assert.equal(first.snapshot.foods.length, current.foods.length + 3);
  assert.equal(first.deferred.length, 3);
  assert.ok(first.deferred.every((item) => item.reason.includes("하루 신규 음식 3개 한도")));
  const rerun = refreshRecommendations({ ...first.snapshot, foods: [...first.snapshot.foods, ...drafts.slice(0, 3)] }, { baseline: first.snapshot, signals: [], date });
  assert.deepEqual(rerun.snapshot, first.snapshot);
  assert.equal(rerun.deferred.length, 3);
  const next = refreshRecommendations({ ...first.snapshot, foods: [...first.snapshot.foods, ...drafts.slice(0, 3)] }, { baseline: first.snapshot, signals: [], date: "2026-11-17" });
  assert.equal(next.snapshot.foods.length, current.foods.length + 6);
  assert.deepEqual(next.snapshot.recommendation!.newSlugs, drafts.slice(0, 3).map((food) => food.slug));
});

test("사진이 확보된 신규 한 개가 이미 있으면 나머지 두 자리만 채우고 기존 음식 보강은 계속 반영한다", () => {
  const current = baseline();
  const first = refreshRecommendations(incoming(current, true), { baseline: current, signals: [], date }).snapshot;
  const source = current.foods.find((food) => !generatedImages[food.image] && !generatedImages[food.heroImage ?? ""])!;
  const drafts = Array.from({ length: 3 }, (_, index) => ({ ...structuredClone(source), slug: `remaining-${index}`, name: `나머지 음식 ${index}`, publishedAt: undefined, checkedAt: date }));
  const staged = { ...first, foods: [...first.foods.map((food) => food.slug === source.slug ? { ...food, tip: "보강한 조리 팁" } : food), ...drafts] };
  const result = refreshRecommendations(staged, { baseline: first, signals: [], date });
  assert.equal(result.snapshot.recommendation!.newSlugs.length, 3);
  assert.equal(result.snapshot.foods.find((food) => food.slug === source.slug)!.tip, "보강한 조리 팁");
  assert.equal(result.deferred.length, 1);
});

test("신규·대기 원고 전체에서 사진을 확보한 인기 점수 상위 세 개를 점수순으로 게시한다", () => {
  const current = baseline();
  const source = current.foods.find((food) => !generatedImages[food.image] && !generatedImages[food.heroImage ?? ""])!;
  const drafts = Array.from({ length: 6 }, (_, index) => ({ ...structuredClone(source), slug: `popular-food-${index}`, name: `인기 후보 ${index}`,
    publishedAt: undefined, checkedAt: index < 3 ? "2026-11-15" : date,
    ...(index === 0 ? { image: "pending", heroImage: undefined } : {}) }));
  const signals = drafts.map((food, index) => signal(food.name, [100, 90, 70, 10, 80, 20][index]));
  const staged = { ...current, foods: [...current.foods, ...drafts] };
  const expected = [drafts[1], drafts[4], drafts[2]].map((food) => food.slug);
  for (const foods of [staged.foods, [...staged.foods].reverse()]) {
    const result = refreshRecommendations({ ...staged, foods }, { baseline: current, signals, date });
    assert.deepEqual(result.snapshot.recommendation!.newSlugs, expected);
    assert.deepEqual(result.snapshot.foods.slice(0, 3).map((food) => food.slug), expected);
    assert.equal(result.deferred.length, 3);
    assert.ok(result.deferred.some((item) => item.slug === drafts[0].slug && item.reason.includes("사진 미확보")));
  }
});

test("인기 점수는 음식명 표기를 정규화하고 비정상·근거 없는 점수는 제외하며 동점 순서를 고정한다", () => {
  const current = baseline();
  const drafts = ["동점 음식", "인기 음식", "잘못된 신호", "신호 없는 음식"].map((name, index) => ({ ...current.foods[0], name,
    slug: `ranking-${index}`, checkedAt: date, publishedAt: undefined }));
  const staged = { ...current, foods: [...current.foods, ...drafts] };
  const signals = [signal("인기음식", 20), signal("인기 음식", 5), signal(drafts[0].name, 20),
    signal(drafts[2].name, Infinity), signal(drafts[2].name, NaN), signal(drafts[2].name, -1),
    { ...signal(drafts[2].name, 100), multiplier: 1 }, { ...signal(drafts[2].name, 100), multiplier: NaN }];
  assert.deepEqual(publicationCandidates(staged, current, signals).map((food) => food.slug), drafts.map((food) => food.slug));
  assert.deepEqual(publicationCandidates({ ...staged, foods: [...staged.foods].reverse() }, current, signals).map((food) => food.slug), drafts.map((food) => food.slug));
  // 검색 상승이 없는 최신 음식도 확인된 언급 점수로 비교한다.
  assert.equal(publicationCandidates(staged, current, [{ ...signal(drafts[3].name, 30), multiplier: 1, recent: true, trend: [] }])[0].slug, drafts[3].slug);
});

test("한국 자정을 기준으로 게시 한도를 초기화하고 UTC 날짜 변경만으로 세 자리를 다시 허용하지 않는다", () => {
  const current = baseline();
  const source = current.foods.find((food) => !generatedImages[food.image] && !generatedImages[food.heroImage ?? ""])!;
  current.foods.push(...Array.from({ length: 3 }, (_, index) => ({ ...source, slug: `kst-${index}`, name: `한국 날짜 음식 ${index}`, publishedAt: "2026-11-16" })));
  assert.equal(publicationDate(new Date("2026-11-15T15:01:00Z")), "2026-11-16");
  assert.equal(publicationSlots(current, publicationDate(new Date("2026-11-16T00:01:00Z"))), 0);
  assert.equal(publicationSlots(current, publicationDate(new Date("2026-11-16T15:01:00Z"))), 3);
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
  const state = JSON.parse(await readFile(join(temporary, "data/discovery-state.json"), "utf8"));
  assert.equal(state.pending.length, 1);
  assert.equal(saved.foods.some((food) => food.slug === state.pending[0].food.slug), false);
  const report = JSON.parse(await readFile(join(temporary, "data/recommendation-report.json"), "utf8"));
  assert.equal(report.accepted.length, 0);
  assert.equal(report.deferred.length, 1);
  assert.deepEqual(report.publication, { target: 3, publishedToday: 0, shortfall: 3 });
});
