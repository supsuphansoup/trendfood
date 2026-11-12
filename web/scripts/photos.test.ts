import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as photoData from "../src/data/photos.ts";
import { seedFoods } from "../src/data/seed-foods.ts";
import { downloadPhoto } from "./fetch-photos.ts";
import { cleanPhotoDraft, photoDimensions, photoFileError, photoLabel, photoLicenses, publicPhotoUrl, uploadedPhotoIds, validPhotoPath, type PhotoDraft, type PublishedPhoto } from "../src/data/photos.ts";

const draft: PhotoDraft = { credit: "트렌드푸드 직접 촬영", source_url: "", license: "직접 촬영", confirmed: true };

test("사진 입력 검증: 빈 출처·원본 주소·사용 확인을 안내하고 공백을 정리한다", () => {
  assert.equal(cleanPhotoDraft({ ...draft, credit: "  " }).error, "출처 표시를 적어 주세요.");
  for (const license of photoLicenses.filter((item) => item !== "직접 촬영")) {
    for (const source_url of ["", " ", "http://example.com/photo", "example.com/photo"]) {
      assert.equal(cleanPhotoDraft({ ...draft, license, source_url }).error, "원본 주소를 https:// 로 시작하게 적어 주세요.");
    }
    assert.deepEqual(cleanPhotoDraft({ ...draft, license, credit: " 작가 이름 ", source_url: " https://example.com/photo " }).value, { credit: "작가 이름", source_url: "https://example.com/photo", license });
  }
  assert.equal(cleanPhotoDraft({ ...draft, confirmed: false }).error, "사진을 써도 되는지 확인하고 체크해 주세요.");
  assert.deepEqual(cleanPhotoDraft(draft).value, { credit: draft.credit, source_url: "", license: "직접 촬영" });
  assert.equal(cleanPhotoDraft({ ...draft, source_url: "http://example.com" }).error, "원본 주소를 https:// 로 시작하게 적어 주세요.");
  assert.equal(cleanPhotoDraft({ ...draft, credit: "가".repeat(100) }).value?.credit.length, 100);
});

test("사진 파일 검증: 파일 없음·HEIC·텍스트·20MB 초과를 거부한다", () => {
  assert.equal(photoFileError(undefined), "사진 파일을 골라 주세요.");
  for (const type of ["image/heic", "text/plain", ""]) assert.equal(photoFileError({ type, size: 1 }), "JPG·PNG·WebP 사진만 올릴 수 있어요. 아이폰 사진(HEIC)은 JPG 로 바꿔 주세요.");
  for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.equal(photoFileError({ type, size: 20 * 1024 * 1024 }), undefined);
  assert.equal(photoFileError({ type: "image/png", size: 20 * 1024 * 1024 + 1 }), "사진이 너무 커요(20MB 까지).");
});

test("사진 크기: 가로·세로 긴 변 1600, 작은 사진과 경계 유지", () => {
  assert.deepEqual(photoDimensions(3000, 2000), { width: 1600, height: 1067 });
  assert.deepEqual(photoDimensions(2000, 3000), { width: 1067, height: 1600 });
  assert.deepEqual(photoDimensions(640, 480), { width: 640, height: 480 });
  assert.deepEqual(photoDimensions(1600, 900), { width: 1600, height: 900 });
  assert.deepEqual(photoDimensions(4000, 1), { width: 1600, height: 1 });
});

test("사진 목록 이름: 출처와 한국 날짜의 월/일을 표시한다", () => {
  assert.equal(photoLabel({ credit: "홍길동", created_at: "2026-11-10T23:00:00Z" }), "올린 사진 · 홍길동 · 11/11");
  assert.equal(photoLabel({ credit: "직접 촬영", created_at: "2026-01-01T00:00:00Z" }), "올린 사진 · 직접 촬영 · 1/1");
});

const id = "00000000-0000-4000-8000-000000000001";
const path = `${id}.webp`;
const uploaded: PublishedPhoto = { id, path, width: 32, height: 24, credit: "테스트 사진 작가", source_url: "https://example.com/test-photo", license: "CC BY" };

test("사진 UUID 고르기: 번들 키·빈 값·잘못된 값·중복 제외", () => {
  assert.deepEqual(uploadedPhotoIds(["dubai", "", null, undefined, id, id, "../photo", "x".repeat(36)]), [id]);
});

test("사진 공개 주소와 경로: 지정 프로젝트의 food-photos WebP 파일만 허용", () => {
  assert.equal(publicPhotoUrl("https://project.supabase.co/", path), `https://project.supabase.co/storage/v1/object/public/food-photos/${path}`);
  assert.equal(validPhotoPath(path), true);
  for (const invalid of ["../" + path, "/" + path, path + "?x=1", path.replace("webp", "jpg"), "https://example.com/photo.webp", "photo.webp"]) {
    assert.equal(validPhotoPath(invalid), false);
    assert.throws(() => publicPhotoUrl("https://project.supabase.co", invalid), /사진 경로 형식 오류/);
  }
});

test("사진 내려받기: 가짜 fetch의 정상 WebP를 로컬 파일로 저장", async () => {
  let saved = false;
  await downloadPhoto("https://project.supabase.co", path, async (url, options) => {
    assert.equal(url, publicPhotoUrl("https://project.supabase.co", path));
    assert.equal(options?.redirect, "error");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/webp" } });
  }, async (destination, data) => {
    assert.equal(destination, path);
    assert.deepEqual(data, new Uint8Array([1, 2, 3]));
    saved = true;
  });
  assert.equal(saved, true);
});

test("사진 내려받기 실패: 404·다른 content-type·잘못된 경로·2MB 초과·네트워크·쓰기 오류", async () => {
  const neverSave = async () => { assert.fail("오류 응답은 저장하면 안 된다"); };
  for (const [response, reason] of [
    [new Response(null, { status: 404 }), "HTTP 404"],
    [new Response(null, { status: 206 }), "HTTP 206"],
    [new Response("text", { headers: { "content-type": "text/plain" } }), "WebP 사진이 아니에요"],
    [new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { "content-type": "image/webp" } }), "2MB 를 넘어요"],
    [new Response(null, { headers: { "content-type": "image/webp", "content-length": String(2 * 1024 * 1024 + 1) } }), "2MB 를 넘어요"],
  ] as const) {
    await assert.rejects(downloadPhoto("https://project.supabase.co", path, async () => response, neverSave), { message: `[photos] 사진을 내려받지 못했어요: ${path} (${reason})` });
  }
  await assert.rejects(downloadPhoto("https://project.supabase.co", "../bad.webp", async () => { assert.fail("잘못된 경로는 요청하면 안 된다"); }, neverSave), { message: "[photos] 사진을 내려받지 못했어요: ../bad.webp (사진 경로 형식 오류)" });
  await assert.rejects(downloadPhoto("https://project.supabase.co", path, async () => { throw new Error("연결 실패"); }, neverSave), { message: `[photos] 사진을 내려받지 못했어요: ${path} (연결 실패)` });
  await assert.rejects(downloadPhoto("https://project.supabase.co", path, async () => new Response(null, { headers: { "content-type": "image/webp" } }), async () => { throw new Error("저장 실패"); }), { message: `[photos] 사진을 내려받지 못했어요: ${path} (저장 실패)` });
});

// Node에는 Next의 이미지 import 처리가 없으므로 이미지 로더만 대체하고 실제 toFood 코드를 실행한다.
const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/foods.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const foodExports = {} as typeof import("../src/lib/foods.ts");
runInNewContext(compiled.outputText, {
  exports: foodExports,
  require: (specifier: string) => {
    if (specifier.startsWith("@/assets/demo/")) return { default: { src: specifier, width: 640, height: 480, blurDataURL: "data:image/jpeg;base64,dGVzdA==" } };
    if (specifier === "@/data/seed-foods") return { seedFoods };
    if (specifier === "@/data/photos") return photoData;
    if (specifier === "@/data/photo-credits") return { photoCredits: {} };
    if (specifier === "@/lib/curated-photos") return { curatedPhotos: {} };
    if (specifier === "@/data/catalog-schema") return {};
    throw new Error(`예상하지 못한 import: ${specifier}`);
  },
});

test("toFood: 올린 사진은 로컬 경로·크기·출처, 번들 사진과 없는 UUID는 기존 동작", () => {
  const record = seedFoods.find((food) => food.slug === "tuna-gimbap")!;
  const { toFood, photos } = foodExports;
  const food = toFood({ ...record, image: id }, [uploaded]);
  assert.equal(food.image.src, `/photos/${path}`);
  assert.equal(food.image.width, 32);
  assert.equal(food.image.height, 24);
  assert.equal(food.image.blurDataURL, undefined);
  assert.equal(JSON.stringify(food.photoCredit), JSON.stringify({ credit: uploaded.credit, sourceUrl: uploaded.source_url, license: "CC BY" }));
  assert.equal(toFood(record, [uploaded]).image, photos.gimbap);
  assert.equal(toFood(record, [uploaded]).photoCredit, undefined);
  assert.equal(toFood({ ...record, image: id }).image, photos.dubai);
  assert.equal(toFood({ ...record, image: id }).photoCredit, undefined);
});

test("toFood 출처: 실제 표시되는 히어로 우선, 번들 히어로에는 올린 사진 출처 없음", () => {
  const record = seedFoods[0];
  const { toFood, photos } = foodExports;
  assert.equal(toFood({ ...record, image: "dubai", heroImage: id }, [uploaded]).photoCredit?.credit, uploaded.credit);
  const bundledHero = toFood({ ...record, image: id, heroImage: "dubai2" }, [uploaded]);
  assert.equal(bundledHero.heroImage, photos.dubai2);
  assert.equal(bundledHero.photoCredit, undefined);
  assert.equal(toFood({ ...record, image: id, heroImage: "missing" }, [uploaded]).photoCredit?.credit, uploaded.credit);
  assert.equal(toFood({ ...record, image: id, heroImage: undefined }, [{ ...uploaded, path: "../bad.webp" }]).image, photos.dubai);
});
