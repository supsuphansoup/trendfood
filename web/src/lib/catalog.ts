import { createClient } from "@supabase/supabase-js";
import { type FoodRow, rowsToRecords } from "@/data/db-mapping";
import { type Food, foods as seed, toFood } from "@/lib/foods";
import { supabaseConfig } from "@/lib/supabase-config";
import { type PublishedPhoto, uploadedPhotoIds } from "@/data/photos";
import { seedFoods } from "@/data/seed-foods";

// 빌드할 때 한 번만 읽는다 (정적 사이트). Supabase 가 설정돼 있으면 게시된 음식, 없으면 예시 데이터.
// 운영자가 관리자 화면에서 '사이트에 반영'을 누르면 GitHub Actions 가 다시 빌드한다.

let cache: Promise<Food[]> | null = null;

async function load(): Promise<Food[]> {
  const cfg = supabaseConfig();
  // TF_SEED_ONLY=1: 테스트 빌드용. Supabase 주소가 있어도 예시 데이터로 만든다 (관리자 화면은 가짜 Supabase 로 검사)
  if (process.env.TF_SEED_ONLY === "1") {
    const id = "00000000-0000-4000-8000-000000000001";
    const photo: PublishedPhoto = { id, path: `${id}.webp`, width: 32, height: 24, credit: "테스트 사진 작가", source_url: "https://example.com/test-photo", license: "CC BY" };
    return seedFoods.map((record) => toFood(record.slug === "tuna-gimbap" ? { ...record, image: id } : record, [photo]));
  }
  if (!cfg) return seed;
  const db = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } });
  const { data, error } = await db.from("published_foods").select("*");
  if (error) throw new Error(`Supabase 에서 음식 목록을 못 읽었어요: ${error.message}`);
  const records = rowsToRecords((data ?? []) as FoodRow[]);
  if (records.length === 0) throw new Error("게시된 음식이 하나도 없어요. 빈 사이트를 배포하지 않으려고 빌드를 멈춥니다.");
  const ids = uploadedPhotoIds(records.flatMap((record) => [record.image, record.heroImage]));
  let uploaded: PublishedPhoto[] = [];
  if (ids.length) {
    const result = await db.from("photos").select("id, path, width, height, credit, source_url, license").in("id", ids);
    if (result.error) throw new Error(`Supabase 에서 사진 정보를 못 읽었어요: ${result.error.message}`);
    uploaded = (result.data ?? []) as PublishedPhoto[];
  }
  return records.map((record) => toFood(record, uploaded));
}

export function getPublishedFoods(): Promise<Food[]> {
  cache ??= load();
  return cache;
}

export async function getPublishedFood(slug: string) {
  return (await getPublishedFoods()).find((f) => f.slug === slug);
}
