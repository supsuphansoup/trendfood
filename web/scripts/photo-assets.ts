import sharp from "sharp";
import type { PhotoCredit } from "../src/data/photo-credits.ts";

/** 1280px 화면의 2열 목록 카드·PC 상세와 모바일 4:3 상세 구도를 재현한다. */
export function renderPhotoDisplayPreviews(input: Buffer, detailFit: "contain" | "cover" = "cover"): Promise<Buffer[]> {
  const image = sharp(input);
  const background = { r: 0, g: 0, b: 0, alpha: 0 };
  return Promise.all([
    image.clone().resize(568, 240, { fit: "cover" }).webp({ quality: 80 }).toBuffer(),
    image.clone().resize(540, 540, { fit: detailFit, position: detailFit === "contain" ? "east" : "centre", background }).webp({ quality: 80 }).toBuffer(),
    image.clone().resize(352, 264, { fit: detailFit, background }).webp({ quality: 80 }).toBuffer(),
  ]);
}

/** 원본 크기에 대한 비율로 검토한 구도를 동기화할 때도 보존한다. */
export async function renderCuratedPhoto(input: Uint8Array, crop?: PhotoCredit["crop"]): Promise<Buffer> {
  let image = sharp(input, { limitInputPixels: 40_000_000 }).rotate();
  if (crop) {
    if (![crop.left, crop.top, crop.width, crop.height].every(Number.isFinite) || crop.left < 0 || crop.top < 0 || crop.width <= 0 || crop.height <= 0 || crop.left + crop.width > 1 || crop.top + crop.height > 1) {
      throw new Error("사진 자르기 범위가 원본을 벗어났어요.");
    }
    const { data, info } = await image.toBuffer({ resolveWithObject: true });
    const left = Math.floor(crop.left * info.width), top = Math.floor(crop.top * info.height);
    image = sharp(data).extract({ left, top, width: Math.max(1, Math.min(info.width - left, Math.round(crop.width * info.width))), height: Math.max(1, Math.min(info.height - top, Math.round(crop.height * info.height))) });
  }
  return image.resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
}

/** 사진 등록부와 정적 import 목록을 같은 키로 유지한다. */
export function photoModule(keys: string[]): string {
  if (keys.some((key) => !/^photo-[a-z0-9-]+$/.test(key))) throw new Error("잘못된 사진 키");
  return `${keys.map((key, index) => `import photo${index} from "@/assets/curated/${key}.webp";`).join("\n")}\n\nexport const curatedPhotos = {\n${keys.map((key, index) => `  "${key}": photo${index},`).join("\n")}\n};\n`;
}
