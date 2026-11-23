import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { parseContent } from "../src/data/content.ts";
import { emptyDiscovery, readDiscovery, readyPending, restorePending } from "./pipeline/discovery.ts";
import { publishPendingPhotos } from "./pipeline/recommendations.ts";
import { recipeDescriptions } from "./pipeline/sources.ts";
import { publicationDate } from "./pipeline/publish-policy.ts";

// 별도 AI 키를 읽거나 원고·사진·상품 검색을 호출하지 않는다.
const date = publicationDate(new Date());
const target = "src/data/content/foods.json";
const current = parseContent(JSON.parse(await readFile(target, "utf8")));
let state = emptyDiscovery();
try { state = readDiscovery(JSON.parse(await readFile("data/discovery-state.json", "utf8")), date); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
const descriptions = async (ids: string[]) => {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new Error("사진 대기 원고의 원문 재확인에 YOUTUBE_API_KEY가 필요해요");
  return recipeDescriptions(ids, key);
};
await mkdir("data", { recursive: true });
async function atomic(path: string, value: unknown) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n");
  await rename(temporary, path);
}
// 검사·push 전에 캐시에서 원고를 제거하지 않는다. 다음 정규 수집이 공개 목록과 대조해 정리한다.
if (process.argv.includes("--prepare")) {
  const rechecked = await readyPending(state, date, descriptions);
  await atomic("data/recommendation-input.json", { baseline: current, signals: rechecked.signals, date });
  await atomic(target, restorePending(current, rechecked));
  console.log(`사진 검색 전 대기 원문 재확인: 통과 ${rechecked.pending.length}개 · AI 원고 생성 없음`);
} else {
  const result = await publishPendingPhotos(current, state, date, descriptions);
  await atomic("data/recommendation-report.json", { date, basis: result.snapshot.recommendation!.basis,
    reason: "등록한 생성 사진 연결 · 공식 원문 재확인 · 추가 AI 호출 없음", accepted: result.accepted, deferred: result.deferred });
  await atomic(target, result.snapshot);
  console.log(`사진 대기 원고: 공개 ${result.accepted.length}개 · 보류 ${result.deferred.length}개 · 추가 AI 호출 없음`);
}
