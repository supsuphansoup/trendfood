// 게시된 사진만 빌드 결과에 포함한다. 원본 출처 주소에서는 내려받지 않는다.
import { realpathSync } from "node:fs";
import { copyFile, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import content from "../src/data/content/foods.json" with { type: "json" };
import { parseContent } from "../src/data/content.ts";
import { contentEditUploads, editedContentRecords, parseContentEdits } from "../src/data/content-edits.ts";
import { publicPhotoUrl, uploadedPhotoIds } from "../src/data/photos.ts";
import { contentAdminEnabled, supabaseConfig } from "../src/lib/supabase-config.ts";

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
  const published = contentAdminEnabled() ? await db.rpc("published_content_edits") : null;
  if (published?.error) throw new Error(`Supabase 게시 관리 데이터를 못 읽었어요: ${published.error.message}`);
  const edits = published ? parseContentEdits(published.data) : null;
  let ids: string[] = [];
  if (edits) {
    ids = contentEditUploads(edits);
  } else if (process.env.TF_CONTENT_ONLY !== "1") {
    const { data: foods, error } = await db.from("published_foods").select("image, hero_image");
    if (error) throw new Error(`Supabase 에서 음식 목록을 못 읽었어요: ${error.message}`);
    ids = uploadedPhotoIds((foods ?? []).flatMap((food) => [food.image, food.hero_image]));
  }
  let photos: { id: string; path: string; width: number; height: number; credit: string; source_url: string; license: string }[] = [];
  if (ids.length) {
    for (let index = 0; index < ids.length; index += 100) {
      const result = await db.from("photos").select("id, path, width, height, credit, source_url, license").in("id", ids.slice(index, index + 100));
      if (result.error) throw new Error(`Supabase 에서 사진 정보를 못 읽었어요: ${result.error.message}`);
      photos.push(...result.data ?? []);
    }
  }
  if (edits) {
    const records = editedContentRecords(parseContent(content), edits, photos.map((photo) => photo.id));
    const visible = new Set(uploadedPhotoIds(records.flatMap((food) => [food.image, food.heroImage])));
    photos = photos.filter((photo) => visible.has(photo.id));
    await mkdir(new URL("data/", web), { recursive: true });
    await writeFile(new URL("data/published-content.json", web), JSON.stringify({ records, photos }));
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
