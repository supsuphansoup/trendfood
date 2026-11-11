import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanPhotoDraft, photoDimensions, photoFileError, photoLabel, photoLicenses, type PhotoDraft } from "../src/data/photos.ts";

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
