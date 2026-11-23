import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { parseContent } from "../src/data/content.ts";
import { photoCredits } from "../src/data/photo-credits.ts";
import type { PhotoCredit } from "../src/data/photo-credits.ts";
import { aiConfig, askJson } from "./pipeline/llm.ts";
import { automaticPhotos, downloadCandidate } from "./photo-automation.ts";
import { searchPhotoSources } from "./photo-sources.ts";
import { photoModule } from "./photo-assets.ts";
import { generatedImages } from "../src/data/generated-images.ts";
import { appendGeneratedPhotos, editReference, generatedPhotoFactory, readImageState, type ImageState } from "./generated-photo-automation.ts";

async function atomic(path: string, content: string | Buffer) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

async function main() {
  if (!aiConfig()) throw new Error("사진 자동 검증에 AI_MODEL·AI 공급자의 API 키가 필요해요");
  const limit = Number(process.env.PIPELINE_PHOTO_LIMIT || 5);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("PIPELINE_PHOTO_LIMIT는 1~20 정수여야 해요");
  const preview = process.argv.includes("--dry-run");
  const now = new Date();
  await mkdir("data", { recursive: true });
  const imageStatePath = "data/image-generation-state.json";
  let imageState: ImageState = { version: 1, attempts: [] };
  try { imageState = readImageState(JSON.parse(await readFile(imageStatePath, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  // 워크플로에서 일일 예약 기록을 먼저 보존한 실행만 유료 생성을 허용한다.
  const imageEnabled = !preview && process.env.PIPELINE_AUTO_IMAGE_GENERATION === "true" && !!process.env.OPENAI_API_KEY?.trim();
  const imageSkipReason = preview ? "미리보기는 이미지 생성 API를 호출하지 않아요" : process.env.PIPELINE_AUTO_IMAGE_GENERATION !== "true" ? "일일 예약 미허용 또는 이미지 자동 생성 중지" : !process.env.OPENAI_API_KEY?.trim() ? "이미지 생성용 OPENAI_API_KEY 미설정" : undefined;
  const inspect = (prompt: string, schema: Record<string, unknown>, images?: { mimeType: "image/webp"; data: string }[]) => askJson(prompt, schema, aiConfig()?.provider === "openai" ? { model: aiConfig()!.model, maxOutputTokens: 2500 } : undefined, images);
  const target = "src/data/content/foods.json";
  const registryPath = "src/data/content/auto-photo-credits.json";
  const current = parseContent(JSON.parse(await readFile(target, "utf8")));
  const registry = JSON.parse(await readFile(registryPath, "utf8")) as Record<string, PhotoCredit>;
  const searchWarnings = new Set<string>();
  const pexelsConfigured = !!process.env.PEXELS_API_KEY?.trim();
  const result = await automaticPhotos(current, photoCredits, {
    search: (query, checkedAt) => searchPhotoSources(query, checkedAt, { onWarning: (provider) => searchWarnings.add(`${provider}: 검색 실패`) }), download: downloadCandidate,
    generate: inspect,
    ...(imageEnabled ? { illustrate: generatedPhotoFactory({ state: imageState, now, inspect,
      saveState: (state) => atomic(imageStatePath, JSON.stringify(state, null, 2) + "\n"),
      edit: (prompt, reference) => editReference(prompt, reference, process.env.OPENAI_API_KEY!),
    }) } : {}),
  }, now, limit);
  const generated = Object.entries(result.generated).map(([key, image]) => ({ name: image.title, slug: image.slug, key, basis: image.basis, source: image.reference?.url }));
  await atomic("data/photo-report.json", `${JSON.stringify({ checkedAt: now.toISOString(), preview, sources: { commons: true, openverse: true, pexels: pexelsConfigured }, searchWarnings: [...searchWarnings], imageGeneration: { enabled: imageEnabled, dailyLimit: 1, skipReason: imageSkipReason, attempts: imageState.attempts }, generated, accepted: result.accepted, deferred: result.deferred }, null, 2)}\n`);
  if ((result.accepted.length || generated.length) && !preview) {
    await mkdir("src/assets/curated", { recursive: true });
    for (const [key, bytes] of result.assets) await atomic(`src/assets/curated/${key}.webp`, bytes);
    await atomic(registryPath, `${JSON.stringify({ ...registry, ...result.credits }, null, 2)}\n`);
    await atomic("src/lib/curated-photos.ts", photoModule(Object.keys({ ...photoCredits, ...result.credits })));
    if (generated.length) {
      await mkdir("src/assets/generated", { recursive: true });
      for (const [key, bytes] of result.generatedAssets) await atomic(`src/assets/generated/${key}.webp`, bytes);
      await atomic("src/data/content/generated-images.json", JSON.stringify({ ...generatedImages, ...result.generated }, null, 2) + "\n");
      await atomic("src/lib/generated-photos.ts", appendGeneratedPhotos(await readFile("src/lib/generated-photos.ts", "utf8"), Object.keys(result.generated)));
    }
    await atomic(target, `${JSON.stringify(result.snapshot, null, 2)}\n`);
  }
  console.log(`[photos:auto] 적용 가능 ${result.accepted.length}개 · 보류 ${result.deferred.length}개${preview ? " (미리보기, 파일 변경 없음)" : ""}`);
  console.log(`[photos:auto] AI 생성 ${generated.length}개 (참고 사진 ${generated.filter((item) => item.basis === "reference").length} · 음식 설명 ${generated.filter((item) => item.basis === "description").length}) · 자동 생성 ${imageEnabled ? "활성 (하루 최대 1회, 실패도 차감)" : "비활성"}`);
  console.log(`[photos:auto] 생성 예시 → 실사 ${result.accepted.filter((item) => item.replacedGenerated).length}개 · 기존 생성 예시 유지 ${result.deferred.filter((item) => item.retainedGenerated).length}개`);
  if (!pexelsConfigured) console.log("[photos:auto] Pexels 키 미설정: Commons·Openverse로 검색했어요");
  for (const warning of searchWarnings) console.log(`[photos:auto] ${warning}`);
  for (const item of result.deferred) console.log(`[photos:auto] ${item.name}: ${item.reason}`);
}

main().catch((error) => { console.error("[photos:auto] 실패:", error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
