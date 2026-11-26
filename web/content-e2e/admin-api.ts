import { createServer } from "node:http";
import { readFileSync } from "node:fs";

export const adminApiPort = 54325;
export const adminApi = `http://127.0.0.1:${adminApiPort}`;
export const publishedPhotoId = "00000000-0000-4000-8000-000000000001";
export const publishedFixture = {
  foods: {
    "egg-soup": { name: "운영자 수정 계란국", image: publishedPhotoId, alt: "관리자 업로드 계란국 사진" },
    "mint-choco-latte": { hidden: true },
  },
};

if (process.argv.includes("--serve")) {
  const photo = readFileSync(new URL("../e2e/fixtures/uploaded-photo.webp", import.meta.url));
  createServer((request, response) => {
    const url = new URL(request.url ?? "/", adminApi);
    if (url.pathname === `/storage/v1/object/public/food-photos/${publishedPhotoId}.webp`) {
      response.writeHead(200, { "content-type": "image/webp" }).end(photo);
      return;
    }
    let data: unknown;
    if (url.pathname === "/rest/v1/rpc/published_content_edits") data = publishedFixture;
    if (url.pathname === "/rest/v1/photos") data = [{
      id: publishedPhotoId, path: `${publishedPhotoId}.webp`, width: 32, height: 24,
      credit: "테스트 사진 작가", source_url: "https://example.com/photo", license: "CC BY",
    }];
    if (url.pathname === "/") data = { ok: true };
    response.writeHead(data ? 200 : 404, { "content-type": "application/json" }).end(JSON.stringify(data ?? {}));
  }).listen(adminApiPort, "127.0.0.1");
}
