import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { parseContent } from "../src/data/content.ts";
import { refreshRecommendations, type RecommendationInput } from "./pipeline/recommendations.ts";
import { emptyDiscovery, readDiscovery, retainPending } from "./pipeline/discovery.ts";

const target = "src/data/content/foods.json";
const current = parseContent(JSON.parse(await readFile(target, "utf8")));
// 최초 적용은 외부 호출 없이 기존 음식만 순환한다. 수집 성공으로 기록하지 않는다.
const input: RecommendationInput = process.argv.includes("--rotate")
  ? { baseline: current, signals: [], date: new Date().toISOString().slice(0, 10) }
  : JSON.parse(await readFile("data/recommendation-input.json", "utf8"));
parseContent(input.baseline);
const result = refreshRecommendations(current, input);
if (!process.argv.includes("--rotate")) {
  let state = emptyDiscovery();
  try { state = readDiscovery(JSON.parse(await readFile("data/discovery-state.json", "utf8")), input.date); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const temporaryState = `data/discovery-state.json.${process.pid}.tmp`;
  await writeFile(temporaryState, JSON.stringify(retainPending(state, current, result.snapshot, input.date), null, 2) + "\n");
  await rename(temporaryState, "data/discovery-state.json");
}
await mkdir("data", { recursive: true });
await writeFile("data/recommendation-report.json", JSON.stringify({
  date: input.date, basis: result.snapshot.recommendation!.basis,
  reason: `추천 갱신 ${input.date} · ${result.snapshot.recommendation!.basis}`,
  accepted: result.snapshot.foods.filter((food) => result.snapshot.recommendation!.newSlugs.includes(food.slug)).map(({ name, slug }) => ({ name, slug })),
  deferred: result.deferred,
}, null, 2) + "\n");
const temporary = `${target}.${process.pid}.tmp`;
await writeFile(temporary, JSON.stringify(result.snapshot, null, 2) + "\n");
await rename(temporary, target);
console.log(`추천 갱신: ${input.date} · ${result.snapshot.recommendation!.basis} · 대표 ${result.snapshot.foods[0].name} · 사진 보류 ${result.deferred.length}개`);
