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
import { photoCredits, type PhotoCredit } from "@/data/photo-credits";
import { curatedPhotos } from "@/lib/curated-photos";
import { generatedPhotos } from "@/lib/generated-photos";
import { generatedImages, type GeneratedImage } from "@/data/generated-images";

export { categoryOptions, sortOptions, tagOptions } from "@/data/catalog-schema";
export type { FoodRecord, Ingredient, Step };

// 사진 키 → 번들 사진. 올린 사진은 빌드 때 내려받은 /photos/ 경로로 연결한다.
export const photos: Record<string, StaticImageData> = {
  ...curatedPhotos,
  ...generatedPhotos,
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
  imageAvailable: boolean;
  generatedImage?: GeneratedImage;
  photoCredit?: { credit: string; sourceUrl: string; license: string } & Partial<Omit<PhotoCredit, "license">>;
};

export const toFood = (r: FoodRecord, uploaded: PublishedPhoto[] = []): Food => {
  const find = (id: string | undefined) => uploadedPhotoIds([id]).length ? uploaded.find((photo) => photo.id === id && validPhotoPath(photo.path)) : undefined;
  const localImage = (photo: PublishedPhoto): StaticImageData => ({ src: `/photos/${photo.path}`, width: photo.width, height: photo.height });
  const image = find(r.image);
  const hero = find(r.heroImage);
  const heroImage = hero ? localImage(hero) : r.heroImage ? photos[r.heroImage] : undefined;
  const visiblePhoto = heroImage ? hero : image;
  const curatedCredit = photoCredits[r.heroImage ?? r.image];
  const generatedImage = generatedImages[r.heroImage ?? r.image];
  return {
    ...r,
    image: image ? localImage(image) : photos[r.image] ?? photos[FALLBACK_PHOTO],
    heroImage,
    imageAvailable: !!image || (!!photos[r.image] && r.image !== "pending"),
    photoCredit: curatedCredit ? { ...curatedCredit, credit: curatedCredit.author, sourceUrl: curatedCredit.url } : undefined,
    generatedImage: visiblePhoto ? undefined : generatedImage,
    ...(visiblePhoto ? { photoCredit: { credit: visiblePhoto.credit, sourceUrl: visiblePhoto.source_url, license: visiblePhoto.license } } : {}),
  };
};

/** 예시 데이터 (Supabase 연결 전 기본값) */
export const foods: Food[] = seedFoods.map((record) => toFood(record));

export const buyable = (food: Food) => food.ingredients.filter((i) => !i.pantry);

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 수동·자동 등록된 제휴 링크가 없는 재료의 일반 쿠팡 검색 주소. 제휴 수익을 보장하지 않는다. */
export const coupangUrl = (name: string) =>
  `https://www.coupang.com/np/search?q=${encodeURIComponent(name.replace(/\s[\d.]+\s?(g|kg|ml|매|개|개입|구|장|단).*$/, ""))}`;

