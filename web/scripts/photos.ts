import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { curatedLicenses, photoCredits } from "../src/data/photo-credits.ts";
import { photoModule } from "./photo-assets.ts";

// 검토한 manifest만 내려받는다. SNS 이미지나 임의의 검색 결과는 사용하지 않는다.
await mkdir("src/assets/curated", { recursive: true });
for (const [key, photo] of Object.entries(photoCredits)) {
  if (!/^photo-[a-z0-9-]+$/.test(key) || !curatedLicenses.includes(photo.license) ||
      new URL(photo.url).hostname !== "commons.wikimedia.org" ||
      !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(new URL(photo.imageUrl).hostname)) {
    throw new Error(`사진 출처·이용 조건 확인 필요: ${key}`);
  }
  const response = await fetch(photo.imageUrl, { headers: { "User-Agent": "Mozilla/5.0 (Trendfood editorial image import)" } });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`사진 다운로드 실패: ${key} (${response.status})`);
  const input = Buffer.from(await response.arrayBuffer());
  if (input.length > 20 * 1024 * 1024) throw new Error(`사진 파일이 너무 커요: ${key}`);
  const buffer = await sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  await writeFile(`src/assets/curated/${key}.webp`, buffer);
  console.log(`사진 저장: ${key}`);
}
await writeFile("src/lib/curated-photos.ts", photoModule(Object.keys(photoCredits)));
console.log(`${Object.keys(photoCredits).length}개 사진과 번들 목록 갱신 완료`);
