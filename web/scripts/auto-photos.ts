import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { parseContent } from "../src/data/content.ts";
import { photoCredits } from "../src/data/photo-credits.ts";
import type { PhotoCredit } from "../src/data/photo-credits.ts";
import { aiConfig, askJson } from "./pipeline/llm.ts";
import { automaticPhotos, downloadCandidate } from "./photo-automation.ts";
import { searchPhotoSources } from "./photo-sources.ts";
import { photoModule } from "./photo-assets.ts";

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
  const target = "src/data/content/foods.json";
  const registryPath = "src/data/content/auto-photo-credits.json";
  const current = parseContent(JSON.parse(await readFile(target, "utf8")));
  const registry = JSON.parse(await readFile(registryPath, "utf8")) as Record<string, PhotoCredit>;
  const searchWarnings = new Set<string>();
  const pexelsConfigured = !!process.env.PEXELS_API_KEY?.trim();
  const result = await automaticPhotos(current, photoCredits, {
    search: (query, checkedAt) => searchPhotoSources(query, checkedAt, { onWarning: (provider) => searchWarnings.add(`${provider}: 검색 실패`) }), download: downloadCandidate,
    generate: (prompt, schema, images) => askJson(prompt, schema, aiConfig()?.provider === "openai" ? { model: aiConfig()!.model, maxOutputTokens: 2500 } : undefined, images),
  }, new Date(), limit);
  await mkdir("data", { recursive: true });
  await atomic("data/photo-report.json", `${JSON.stringify({ checkedAt: new Date().toISOString(), preview, sources: { commons: true, openverse: true, pexels: pexelsConfigured }, searchWarnings: [...searchWarnings], accepted: result.accepted, deferred: result.deferred }, null, 2)}\n`);
  if (result.accepted.length && !preview) {
    await mkdir("src/assets/curated", { recursive: true });
    for (const [key, bytes] of result.assets) await atomic(`src/assets/curated/${key}.webp`, bytes);
    await atomic(registryPath, `${JSON.stringify({ ...registry, ...result.credits }, null, 2)}\n`);
    await atomic("src/lib/curated-photos.ts", photoModule(Object.keys({ ...photoCredits, ...result.credits })));
    await atomic(target, `${JSON.stringify(result.snapshot, null, 2)}\n`);
  }
  console.log(`[photos:auto] 적용 가능 ${result.accepted.length}개 · 보류 ${result.deferred.length}개${preview ? " (미리보기, 파일 변경 없음)" : ""}`);
  console.log(`[photos:auto] 생성 예시 → 실사 ${result.accepted.filter((item) => item.replacedGenerated).length}개 · 기존 생성 예시 유지 ${result.deferred.filter((item) => item.retainedGenerated).length}개`);
  if (!pexelsConfigured) console.log("[photos:auto] Pexels 키 미설정: Commons·Openverse로 검색했어요");
  for (const warning of searchWarnings) console.log(`[photos:auto] ${warning}`);
  for (const item of result.deferred) console.log(`[photos:auto] ${item.name}: ${item.reason}`);
}

main().catch((error) => { console.error("[photos:auto] 실패:", error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
