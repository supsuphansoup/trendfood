import assert from "node:assert/strict";
import { test } from "node:test";
import { trustedPhotoUrl, validPhotoSource } from "../src/data/photo-source.ts";
import { downloadCandidate } from "./photo-automation.ts";
import { openversePhoto, pexelsPhoto, searchPhotoSources } from "./photo-sources.ts";

const date = "2026-11-13";
const openverse = () => ({
  id: "610756ec-ae31-4d5e-8f03-8cc52f31b71d", title: "Matcha latte", creator: "작가", creator_url: "https://www.flickr.com/photos/123@N01",
  foreign_landing_url: "https://www.flickr.com/photos/123@N01/123456789", url: "https://live.staticflickr.com/65535/123456789_abc123_b.jpg",
  width: 1200, height: 800, license: "by", license_version: "4.0", license_url: "https://creativecommons.org/licenses/by/4.0/",
  source: "flickr", mature: false, category: "photograph", attribution: "사진 출처", tags: [{ name: "matcha" }],
});
const pexels = () => ({ id: 1234, width: 1200, height: 800, url: "https://www.pexels.com/photo/matcha-latte-1234/", photographer: "사진가", photographer_url: "https://www.pexels.com/@photographer", alt: "Matcha latte", src: { original: "https://images.pexels.com/photos/1234/pexels-photo-1234.jpeg" } });
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

test("Openverse는 Flickr 원문·파일 ID·허용 라이선스 버전과 원작자를 대조한다", () => {
  const photo = openversePhoto(openverse(), date)!;
  assert.equal(photo.provider, "openverse"); assert.equal(photo.providerId, openverse().id);
  assert.equal(photo.license, "CC BY 4.0"); assert.equal(photo.author, "작가"); assert.ok(validPhotoSource(photo));
  for (const patch of [
    { license: "by-nc" }, { license_version: "2.0" }, { license_url: "https://creativecommons.org.evil.example/licenses/by/4.0/" },
    { creator: "" }, { creator_url: "javascript:alert(1)" }, { source: "unknown" }, { mature: true }, { category: "illustration" }, { width: 200 },
    { title: "AI-generated matcha latte" }, { url: "https://localhost/image.jpg" },
    { url: "https://live.staticflickr.com/65535/987654321_abc123_b.jpg" }, { foreign_landing_url: "https://www.flickr.com.evil.example/photos/123/123456789" },
  ]) assert.equal(openversePhoto({ ...openverse(), ...patch }, date), null, JSON.stringify(patch));
  assert.equal(openversePhoto({ ...openverse(), license: "cc0", license_version: "1.0", license_url: "https://creativecommons.org/publicdomain/zero/1.0/" }, date)?.license, "CC0");
});

test("Pexels는 원문·원본 파일 ID와 전용 라이선스를 보존하며 다른 호스트는 거절한다", async () => {
  const photo = pexelsPhoto(pexels(), date)!;
  assert.equal(photo.license, "Pexels License"); assert.equal(photo.creatorUrl, pexels().photographer_url);
  assert.ok(validPhotoSource(photo));
  assert.ok(pexelsPhoto({ ...pexels(), url: "https://www.pexels.com/photo/1234/" }, date));
  for (const patch of [{ id: 0 }, { width: 300 }, { photographer: "" }, { photographer_url: "javascript:alert(1)" }, { alt: "" }, { alt: "AI generated cookie" }, { url: "https://www.pexels.com/photo/cookie-9999/" }, { src: { original: "https://images.pexels.com.evil.example/photos/1234/image.jpeg" } }]) {
    assert.equal(pexelsPhoto({ ...pexels(), ...patch }, date), null);
  }
  assert.equal(validPhotoSource({ ...photo, license: "CC0" }), false);
  assert.equal(trustedPhotoUrl("https://user:password@images.pexels.com/photos/1234/image.jpeg", false, "pexels"), false);
  const buffer = await downloadCandidate(photo, async (_url, init) => {
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return new Response("image bytes", { headers: { "content-type": "image/jpeg" } });
  });
  assert.equal(buffer.toString(), "image bytes");
});

test("공식 검색 API만 호출하고 Pexels 키는 Pexels API에만 보내며 출처를 번갈아 검사한다", async () => {
  const hosts: string[] = [];
  const photos = await searchPhotoSources("말차 라떼", date, { pexelsKey: "test-pexels-key", fetcher: async (input, init) => {
    const url = new URL(String(input)); hosts.push(url.hostname);
    assert.equal(init?.redirect, "error");
    if (url.hostname === "api.pexels.com") {
      assert.equal(new Headers(init?.headers).get("Authorization"), "test-pexels-key");
      assert.equal(url.searchParams.get("query"), "말차 라떼"); return json({ photos: [pexels()] });
    }
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    if (url.hostname === "api.openverse.org") {
      assert.equal(url.searchParams.get("source"), "flickr"); assert.equal(url.searchParams.get("mature"), "false");
      return json({ results: [openverse(), { ...openverse(), id: "610756ec-ae31-4d5e-8f03-8cc52f31b71e", foreign_landing_url: "https://www.flickr.com/photos/123@N01/123456788", url: "https://live.staticflickr.com/65535/123456788_abc_b.jpg" }] });
    }
    assert.equal(url.hostname, "commons.wikimedia.org"); return json({ query: { pages: [] } });
  } });
  assert.deepEqual(hosts.sort(), ["api.openverse.org", "api.pexels.com", "commons.wikimedia.org"].sort());
  assert.deepEqual(photos.map((photo) => photo.provider), ["openverse", "pexels", "openverse"]);
});

test("검색처 장애·한도 응답은 다른 출처를 막지 않고, 키가 없으면 Pexels를 호출하지 않는다", async () => {
  const warnings: string[] = [];
  const photos = await searchPhotoSources("cookie", date, { pexelsKey: "", onWarning: (provider) => warnings.push(provider), fetcher: async (input) => {
    const host = new URL(String(input)).hostname;
    assert.notEqual(host, "api.pexels.com");
    return host === "commons.wikimedia.org" ? new Response("", { status: 429 }) : json({ results: [openverse()] });
  } });
  assert.equal(photos.length, 1); assert.deepEqual(warnings, ["commons"]);
  await assert.rejects(searchPhotoSources("cookie", date, { pexelsKey: "", fetcher: async () => { throw new Error("연결 실패"); } }), /모든 사진 검색처/);
});
