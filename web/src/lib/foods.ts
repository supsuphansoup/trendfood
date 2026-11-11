import type { StaticImageData } from "next/image";
import bagel from "@/assets/demo/bagel.jpg";
import deopbap from "@/assets/demo/deopbap.jpg";
import dubai from "@/assets/demo/dubai.jpg";
import dubai2 from "@/assets/demo/dubai2.jpg";
import garaetteok from "@/assets/demo/garaetteok.jpg";
import gimbap from "@/assets/demo/gimbap.jpg";
import gyeranppang from "@/assets/demo/gyeranppang.jpg";
import makguksu from "@/assets/demo/makguksu.jpg";
import ramyeon from "@/assets/demo/ramyeon.jpg";
import risotto from "@/assets/demo/risotto.jpg";
import tteokbokki from "@/assets/demo/tteokbokki.jpg";
import { type FoodRecord, type Ingredient, type Step } from "@/data/catalog-schema";
import { seedFoods } from "@/data/seed-foods";
import { type PublishedPhoto, uploadedPhotoIds, validPhotoPath } from "@/data/photos";

export { categoryOptions, sortOptions, tagOptions } from "@/data/catalog-schema";
export type { FoodRecord, Ingredient, Step };

// 사진 키 → 번들 사진. 올린 사진은 빌드 때 내려받은 /photos/ 경로로 연결한다.
export const photos: Record<string, StaticImageData> = {
  bagel,
  deopbap,
  dubai,
  dubai2,
  garaetteok,
  gimbap,
  gyeranppang,
  makguksu,
  ramyeon,
  risotto,
  tteokbokki,
};
const FALLBACK_PHOTO = "dubai";

export type Food = Omit<FoodRecord, "image" | "heroImage"> & {
  image: StaticImageData;
  heroImage?: StaticImageData;
  photoCredit?: { credit: string; sourceUrl: string; license: string };
};

export const toFood = (r: FoodRecord, uploaded: PublishedPhoto[] = []): Food => {
  const find = (id: string | undefined) => uploadedPhotoIds([id]).length ? uploaded.find((photo) => photo.id === id && validPhotoPath(photo.path)) : undefined;
  const localImage = (photo: PublishedPhoto): StaticImageData => ({ src: `/photos/${photo.path}`, width: photo.width, height: photo.height });
  const image = find(r.image);
  const hero = find(r.heroImage);
  const heroImage = hero ? localImage(hero) : r.heroImage ? photos[r.heroImage] : undefined;
  const visiblePhoto = heroImage ? hero : image;
  return {
    ...r,
    image: image ? localImage(image) : photos[r.image] ?? photos[FALLBACK_PHOTO],
    heroImage,
    ...(visiblePhoto ? { photoCredit: { credit: visiblePhoto.credit, sourceUrl: visiblePhoto.source_url, license: visiblePhoto.license } } : {}),
  };
};

/** 예시 데이터 (Supabase 연결 전 기본값) */
export const foods: Food[] = seedFoods.map((record) => toFood(record));

export const buyable = (food: Food) => food.ingredients.filter((i) => !i.pantry);

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 쿠팡 파트너스 링크 자리. 승인 전에는 운영자가 수동 등록(CLAUDE.md), MVP는 쿠팡 검색 링크로 대신한다 */
export const coupangUrl = (name: string) =>
  `https://www.coupang.com/np/search?q=${encodeURIComponent(name.replace(/\s[\d.]+\s?(g|kg|ml|매|개|개입|구|장|단).*$/, ""))}`;

