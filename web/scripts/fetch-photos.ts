// 게시된 사진만 빌드 결과에 포함한다. 원본 출처 주소에서는 내려받지 않는다.
import { realpathSync } from "node:fs";
import { copyFile, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { publicPhotoUrl, uploadedPhotoIds } from "../src/data/photos.ts";
import { supabaseConfig } from "../src/lib/supabase-config.ts";

export async function downloadPhoto(
  supabaseUrl: string,
  path: string,
  fetchPhoto: typeof fetch,
  savePhoto: (path: string, data: Uint8Array) => Promise<void>,
) {
  try {
    const url = publicPhotoUrl(supabaseUrl, path);
    const response = await fetchPhoto(url, { redirect: "error" });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "image/webp") throw new Error("WebP 사진이 아니에요");
    const limit = 2 * 1024 * 1024;
    if (Number(response.headers.get("content-length")) > limit) throw new Error("2MB 를 넘어요");
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.byteLength > limit) throw new Error("2MB 를 넘어요");
    await savePhoto(path, data);
  } catch (error) {
    throw new Error(`[photos] 사진을 내려받지 못했어요: ${path} (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function main() {
  const web = new URL("../", import.meta.url);
  nextEnv.loadEnvConfig(fileURLToPath(web));
  const cfg = supabaseConfig();
  const seedOnly = process.env.TF_SEED_ONLY === "1";
  const directory = new URL("public/photos/", web);
  if (!cfg || seedOnly) {
    console.log("[photos] Supabase 없음 → 건너뜀");
    if (seedOnly) {
      await mkdir(directory, { recursive: true });
      await copyFile(new URL("e2e/fixtures/uploaded-photo.webp", web), new URL("00000000-0000-4000-8000-000000000001.webp", directory));
    }
    return;
  }
  const db = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } });
  const { data: foods, error } = await db.from("published_foods").select("image, hero_image");
  if (error) throw new Error(`Supabase 에서 음식 목록을 못 읽었어요: ${error.message}`);
  const ids = uploadedPhotoIds((foods ?? []).flatMap((food) => [food.image, food.hero_image]));
  let photos: { id: string; path: string }[] = [];
  if (ids.length) {
    const result = await db.from("photos").select("id, path").in("id", ids);
    if (result.error) throw new Error(`Supabase 에서 사진 정보를 못 읽었어요: ${result.error.message}`);
    photos = result.data ?? [];
  }
  await mkdir(directory, { recursive: true });
  // 이 전용 폴더 바로 아래의 WebP 파일만 정리한다.
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".webp")) await unlink(new URL(entry.name, directory));
  }
  for (const photo of photos) {
    await downloadPhoto(cfg.url, photo.path, fetch, async (path, data) => { await writeFile(new URL(path, directory), data); });
  }
  console.log(`[photos] ${photos.length}개 내려받음`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
