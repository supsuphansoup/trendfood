import { mkdir, writeFile } from "node:fs/promises";
import { photoCredits } from "../src/data/photo-credits.ts";
import { validPhotoSource } from "../src/data/photo-source.ts";
import { downloadCandidate } from "./photo-automation.ts";
import sharp from "sharp";
import { photoModule } from "./photo-assets.ts";

// 검토한 manifest만 내려받는다. SNS 이미지나 임의의 검색 결과는 사용하지 않는다.
await mkdir("src/assets/curated", { recursive: true });
for (const [key, photo] of Object.entries(photoCredits)) {
  if (!/^photo-[a-z0-9-]+$/.test(key) || !validPhotoSource(photo)) {
    throw new Error(`사진 출처·이용 조건 확인 필요: ${key}`);
  }
  const input = await downloadCandidate({ ...photo, description: "" });
  const buffer = await sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  await writeFile(`src/assets/curated/${key}.webp`, buffer);
  console.log(`사진 저장: ${key}`);
}
await writeFile("src/lib/curated-photos.ts", photoModule(Object.keys(photoCredits)));
console.log(`${Object.keys(photoCredits).length}개 사진과 번들 목록 갱신 완료`);
