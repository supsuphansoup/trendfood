import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import type { ContentSnapshot } from "../src/data/content.ts";
import { generatedImages } from "../src/data/generated-images.ts";
import { AiQuotaError } from "./pipeline/llm.ts";
import { automaticPhotos, downloadCandidate, licensedPhoto, photoBatch, searchPhotos, trustedPhotoUrl } from "./photo-automation.ts";
import { photoModule } from "./photo-assets.ts";

const input = JSON.parse(await readFile(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const now = new Date("2026-11-12T06:00:00Z");
const page = () => ({ pageid: 123, title: "File:Test food.jpg", imageinfo: [{
  url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Test_food.jpg",
  mime: "image/jpeg", width: 1200, height: 900, size: 10_000, sha1: "a".repeat(40),
  extmetadata: { LicenseShortName: { value: "CC0" }, LicenseUrl: { value: "http://creativecommons.org/publicdomain/zero/1.0/deed.en" }, Artist: { value: '<a href="https://example.com">사진 작가</a>' }, Copyrighted: { value: "True" }, ImageDescription: { value: "같은 음식의 사진" } },
}] });
const candidate = () => licensedPhoto(page(), "2026-11-12")!;
const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ddaa55" } }).jpeg().toBuffer();
const verdict = { match: true, confidence: 0.99, photograph: true, unobstructed: true, metadataMatches: true, recipeMatches: true, presentationSuitable: true, reason: "메뉴와 일치" };
const current = (): ContentSnapshot => ({ ...structuredClone(input), foods: [structuredClone(input.foods[0]), { ...structuredClone(input.foods[1]), image: "pending", slug: "test-pending" }] });

test("공식 사진 메타데이터: 허용 이용 조건·작가·크기·출처를 확인한다", () => {
  const photo = candidate();
  assert.equal(photo.author, "사진 작가");
  assert.equal(photo.license, "CC0");
  assert.equal(photo.automatic, true);
  const publicDomain = page();
  publicDomain.imageinfo[0].extmetadata.LicenseShortName.value = "Public domain";
  publicDomain.imageinfo[0].extmetadata.Copyrighted.value = "False";
  assert.equal(licensedPhoto(publicDomain, "2026-11-12")?.license, "Public domain");
  for (const [name, path] of [["CC BY 4.0", "by"], ["CC BY-SA 4.0", "by-sa"]]) {
    const value = page();
    value.imageinfo[0].extmetadata.LicenseShortName.value = name;
    value.imageinfo[0].extmetadata.LicenseUrl.value = `https://creativecommons.org/licenses/${path}/4.0/`;
    assert.equal(licensedPhoto(value, "2026-11-12")?.license, name);
    value.imageinfo[0].extmetadata.LicenseShortName.value = "CC BY-NC 4.0";
    assert.equal(licensedPhoto(value, "2026-11-12"), null);
  }
  for (const edit of [
    (value: ReturnType<typeof page>) => { value.imageinfo[0].extmetadata.LicenseShortName.value = "CC BY-SA 4.0"; },
    (value: ReturnType<typeof page>) => { value.imageinfo[0].extmetadata.LicenseUrl.value = "https://creativecommons.org.evil.example/publicdomain/zero/1.0/"; },
    (value: ReturnType<typeof page>) => { value.imageinfo[0].extmetadata.Artist.value = ""; },
    (value: ReturnType<typeof page>) => { value.title = "File:AI-generated food.jpg"; },
    (value: ReturnType<typeof page>) => { value.imageinfo[0].width = 200; },
    (value: ReturnType<typeof page>) => { value.imageinfo[0].mime = "image/svg+xml"; },
    (value: ReturnType<typeof page>) => { value.imageinfo[0].descriptionurl = "https://example.com/File:food"; },
    (value: ReturnType<typeof page>) => { value.imageinfo[0].url = "https://upload.wikimedia.org.evil.example/wikipedia/commons/image.jpg"; },
  ]) { const value = page(); edit(value); assert.equal(licensedPhoto(value, "2026-11-12"), null); }
  for (const url of ["http://upload.wikimedia.org/wikipedia/commons/a.jpg", "https://user:pass@upload.wikimedia.org/wikipedia/commons/a.jpg", "https://upload.wikimedia.org:444/wikipedia/commons/a.jpg", "https://upload.wikimedia.org/not-commons.jpg"]) assert.equal(trustedPhotoUrl(url), false);
});

test("사진 검색은 공식 Commons API와 식별 가능한 User-Agent를 사용하고 오류를 보류한다", async () => {
  const photos = await searchPhotos("음식 이름", "2026-11-12", (async (url, init) => {
    assert.equal(new URL(String(url)).hostname, "commons.wikimedia.org");
    assert.equal(new URL(String(url)).searchParams.get("gsrnamespace"), "6");
    assert.match((init?.headers as Record<string, string>)["User-Agent"], /TrendfoodPhotoBot.*github/);
    return Response.json({ query: { pages: [page()] } });
  }) as typeof fetch);
  assert.equal(photos.length, 1);
  await assert.rejects(searchPhotos("이름", "2026-11-12", (async () => Response.json({ error: { code: "maxlag" } })) as typeof fetch), /maxlag/);
});

test("다운로드: 임의 주소·리다이렉트·비이미지·크기 초과를 거절한다", async () => {
  assert.deepEqual(await downloadCandidate(candidate(), (async (_url, init) => {
    assert.equal(init?.redirect, "error");
    return new Response(bytes, { headers: { "Content-Type": "image/jpeg" } });
  }) as typeof fetch), bytes);
  for (const response of [new Response("<html>"), new Response("", { status: 302 }), new Response("", { headers: { "Content-Type": "image/jpeg", "Content-Length": "30000000" } }), new Response(new Uint8Array(20 * 1024 * 1024 + 1), { headers: { "Content-Type": "image/jpeg" } })]) {
    await assert.rejects(downloadCandidate(candidate(), (async () => response) as typeof fetch));
  }
  await assert.rejects(downloadCandidate({ ...candidate(), imageUrl: "https://localhost/image.jpg" }), /허용되지/);
});

test("일치 사진만 WebP·출처 등록부·콘텐츠로 연결하고 기존 사진·레시피·날짜를 보존한다", async () => {
  const original = current();
  const before = structuredClone(original);
  let imageCalls = 0;
  const result = await automaticPhotos(original, {}, {
    search: async () => [candidate()], download: async () => bytes,
    generate: async (prompt, schema, images) => {
      if (!images?.length) return { queries: ["same food", "same food"] };
      imageCalls++;
      assert.equal(images.length, 2); assert.equal(images[0].mimeType, "image/webp");
      const crop = await sharp(Buffer.from(images[1].data, "base64")).metadata();
      assert.equal(crop.width, 768); assert.equal(crop.height, 512);
      assert.match(prompt, /steps/); assert.match(prompt, /음료가 함께/);
      assert.match(prompt, /일회용 포장 용기/); assert.match(prompt, /kind=product/);
      assert.ok((schema.required as string[]).includes("recipeMatches"));
      assert.ok((schema.required as string[]).includes("presentationSuitable"));
      return verdict;
    },
  }, now);
  assert.equal(result.accepted.length, 1);
  assert.equal(imageCalls, 1);
  assert.equal(result.snapshot.foods[1].image, "photo-auto-test-pending");
  assert.equal(result.assets.get("photo-auto-test-pending")!.subarray(8, 12).toString(), "WEBP");
  assert.match(result.credits["photo-auto-test-pending"].note, /개별 검수는 하지 않았어요/);
  assert.deepEqual(result.snapshot.foods[0], before.foods[0]);
  assert.deepEqual(result.snapshot.foods[1].ingredients, before.foods[1].ingredients);
  assert.equal(result.snapshot.foods[1].checkedAt, before.foods[1].checkedAt);
  assert.deepEqual(original, before);
  const repeated = await automaticPhotos(result.snapshot, result.credits, { search: async () => { throw new Error("호출되면 안 됨"); }, download: async () => bytes, generate: async () => { throw new Error("호출되면 안 됨"); } }, now);
  assert.equal(repeated.accepted.length, 0);
});

test("검토에서 내린 자동 사진을 보존하면서 다른 적합 사진은 새 키로 교체한다", async () => {
  const old = { ...candidate(), rejectedReason: "사용자 검토에서 제외" };
  const registered = { "photo-auto-test-pending": old };
  const next = { ...candidate(), url: "https://commons.wikimedia.org/wiki/File:New_food.jpg" };
  const result = await automaticPhotos(current(), registered, { search: async () => [old, next], download: async () => bytes, generate: async (_prompt, _schema, images) => images?.length ? verdict : { queries: [] } }, now);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.snapshot.foods[1].image, "photo-auto-test-pending-2");
  assert.equal(result.credits["photo-auto-test-pending-2"].url, next.url);
  assert.equal(result.credits["photo-auto-test-pending"], undefined);
  assert.deepEqual(registered, { "photo-auto-test-pending": old });
});

test("불일치·낮은 신뢰·가림·합성·메타데이터 불일치·빈 응답은 사진 준비 중으로 남긴다", async () => {
  for (const answer of [{ ...verdict, match: false }, { ...verdict, confidence: 0.94 }, { ...verdict, confidence: NaN }, { ...verdict, photograph: false }, { ...verdict, unobstructed: false }, { ...verdict, metadataMatches: false }, { ...verdict, recipeMatches: false }, { ...verdict, presentationSuitable: false }, { ...verdict, recipeMatches: undefined }, { ...verdict, presentationSuitable: undefined }, null]) {
    const result = await automaticPhotos(current(), {}, { search: async () => [candidate()], download: async () => bytes, generate: async (_prompt, _schema, images) => images?.length ? answer : { queries: [] } }, now);
    assert.equal(result.accepted.length, 0); assert.equal(result.assets.size, 0); assert.equal(result.deferred.length, 1); assert.equal(result.snapshot.foods[1].image, "pending");
  }
});

test("검색 실패·불량 파일·같은 사진 재사용을 보류하며 AI 한도는 전체 실패로 처리한다", async () => {
  const dependencies = { search: async () => [candidate()], download: async () => bytes, generate: async (_prompt: string, _schema: Record<string, unknown>, images?: unknown[]) => images?.length ? verdict : { queries: [] } };
  for (const overrides of [{ search: async () => { throw new Error("API 장애"); } }, { download: async () => Buffer.from("불량 파일") }]) {
    const result = await automaticPhotos(current(), {}, { ...dependencies, ...overrides }, now);
    assert.equal(result.accepted.length, 0); assert.equal(result.deferred.length, 1);
  }
  const registered = { existing: candidate() };
  const reused = await automaticPhotos(current(), registered, dependencies, now);
  assert.equal(reused.accepted.length, 0);
  const original = current();
  await assert.rejects(automaticPhotos(original, {}, { ...dependencies, generate: async () => { throw new AiQuotaError("한도"); } }, now), AiQuotaError);
  assert.equal(original.foods[1].image, "pending");
});

test("사진 준비 중 항목을 날짜별로 순환하며 제한을 넘기지 않고 import 키를 검증한다", () => {
  const foods = Array.from({ length: 20 }, (_, i) => ({ ...current().foods[1], slug: `pending-${i}` }));
  // 기존 8시간 순환은 하루 한 번 실행하면 준비 중 15개 중 같은 5개만 반복했다.
  for (const total of [15, 20]) {
    const pending = foods.slice(0, total);
    const seen = new Set<string>();
    for (let day = 0; day < total / 5; day++) {
      const scheduled = new Date(Date.parse("2026-11-12T01:17:00Z") + day * 86_400_000);
      const batch = photoBatch(pending, scheduled);
      assert.equal(batch.length, 5); for (const food of batch) seen.add(food.slug);
      assert.deepEqual(photoBatch(pending, new Date(scheduled.getTime() + 60_000)), batch);
    }
    assert.equal(seen.size, total);
  }
  assert.equal(photoBatch(foods, now, 999).length, 20);
  assert.match(photoModule(["photo-auto-test"]), /@\/assets\/curated\/photo-auto-test.webp/);
  assert.throws(() => photoModule(["../outside"]));
});

test("실사는 보존하고 등록된 생성 예시와 준비 중 사진을 매일 5개씩 순환 검색한다", () => {
  const generated = input.foods.filter((food) => generatedImages[food.image]);
  assert.ok(generated.length > 0);
  const real = input.foods.find((food) => food.image !== "pending" && !generatedImages[food.image])!;
  const protectedHero = { ...generated[0], slug: generated[0].slug, heroImage: real.image };
  const unknown = { ...generated[0], image: "photo-ai-unregistered" };
  const mismatched = { ...generated[0], slug: "other-food" };
  const pending = current().foods[1];
  const foods = [real, protectedHero, unknown, mismatched, ...generated, pending];
  const seen = new Set<string>();
  for (let day = 0; day < generated.length + 1; day++) {
    const batch = photoBatch(foods, new Date(now.getTime() + day * 86_400_000));
    assert.equal(batch.length, Math.min(5, generated.length + 1));
    assert.ok(batch.every((food) => food === pending || generated.includes(food)));
    for (const food of batch) seen.add(food.slug);
  }
  assert.equal(seen.size, generated.length + 1);
});

test("검증을 통과한 실사만 생성 예시와 히어로를 교체하고 조리법·날짜는 보존한다", async () => {
  const generated = structuredClone(input.foods.find((food) => generatedImages[food.image])!);
  generated.heroImage = generated.image; generated.heroAlt = generated.alt;
  const original = { ...current(), foods: [current().foods[0], generated] };
  const before = structuredClone(original);
  const registryBefore = structuredClone(generatedImages);
  const result = await automaticPhotos(original, {}, { search: async () => [candidate()], download: async () => bytes, generate: async (_prompt, _schema, images) => images?.length ? verdict : { queries: [] } }, now);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].replacedGenerated, true);
  assert.equal(result.deferred.length, 0);
  assert.equal(result.snapshot.foods[1].image, `photo-auto-${generated.slug}`);
  assert.equal(result.snapshot.foods[1].heroImage, undefined);
  assert.equal(result.snapshot.foods[1].heroAlt, undefined);
  assert.doesNotMatch(result.snapshot.foods[1].alt, /AI 생성/);
  const { image: _image, alt: _alt, heroImage: _hero, heroAlt: _heroAlt, ...content } = result.snapshot.foods[1];
  void _image; void _alt; void _hero; void _heroAlt;
  const { image: _oldImage, alt: _oldAlt, heroImage: _oldHero, heroAlt: _oldHeroAlt, ...oldContent } = before.foods[1];
  void _oldImage; void _oldAlt; void _oldHero; void _oldHeroAlt;
  assert.deepEqual(content, oldContent);
  assert.deepEqual(result.snapshot.foods[0], before.foods[0]);
  assert.deepEqual(original, before);
  assert.deepEqual(generatedImages, registryBefore);
});

test("실사 없음·불일치·다운로드/검색 실패에는 생성 예시와 안내를 그대로 유지하고 보류를 기록한다", async () => {
  const generated = structuredClone(input.foods.find((food) => generatedImages[food.image])!);
  generated.heroImage = generated.image; generated.heroAlt = generated.alt;
  const original = { ...current(), foods: [generated] };
  const before = structuredClone(original);
  const dependencies = { search: async () => [candidate()], download: async () => bytes, generate: async (_prompt: string, _schema: Record<string, unknown>, images?: unknown[]) => images?.length ? verdict : { queries: [] } };
  for (const overrides of [
    { search: async () => [] },
    { generate: async (_prompt: string, _schema: Record<string, unknown>, images?: unknown[]) => images?.length ? { ...verdict, recipeMatches: false } : { queries: [] } },
    { download: async () => { throw new Error("EACCES"); } },
    { search: async () => { throw new Error("검색 실패"); } },
  ]) {
    const result = await automaticPhotos(original, {}, { ...dependencies, ...overrides }, now);
    assert.deepEqual(result.snapshot, before);
    assert.equal(result.accepted.length, 0); assert.equal(result.assets.size, 0);
    assert.deepEqual(result.credits, {});
    assert.equal(result.deferred.length, 1);
    assert.equal(result.deferred[0].retainedGenerated, true);
    assert.ok(result.deferred[0].reason);
  }
  await assert.rejects(automaticPhotos(original, {}, { ...dependencies, generate: async () => { throw new AiQuotaError("한도"); } }, now), AiQuotaError);
  assert.deepEqual(original, before);
});

test("키 없는 사진 실행은 기존 사진·등록부·페이지를 바꾸지 않는다", async () => {
  const paths = ["../src/data/content/foods.json", "../src/data/content/auto-photo-credits.json", "../src/lib/curated-photos.ts"];
  const before = await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  const result = spawnSync(process.execPath, ["scripts/auto-photos.ts", "--dry-run"], { encoding: "utf8", env: { ...process.env, AI_MODEL: "", OPENAI_API_KEY: "", GEMINI_API_KEY: "" } });
  assert.equal(result.status, 1); assert.match(result.stderr, /API 키가 필요/);
  assert.deepEqual(await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8"))), before);
});
