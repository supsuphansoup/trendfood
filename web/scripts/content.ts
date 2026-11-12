import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mergeContent, parseContent } from "../src/data/content.ts";

const target = new URL("../src/data/content/foods.json", import.meta.url);
const [command = "check", ...args] = process.argv.slice(2);

try {
  if (!["check", "import"].includes(command)) throw new Error("사용법: npm run content:check 또는 npm run content:import -- 파일.json [--approve]");
  const path = args.find((a) => !a.startsWith("--"));
  if (command === "import" && !path) throw new Error("가져올 JSON 파일 경로가 필요해요");
  const snapshot = parseContent(JSON.parse(await readFile(path ? resolve(path) : target, "utf8")), args.includes("--approve"));
  if (command === "import") {
    const merged = mergeContent(parseContent(JSON.parse(await readFile(target, "utf8"))), snapshot);
    const temporary = new URL(`./foods.${process.pid}.tmp`, target);
    await writeFile(temporary, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  }
  console.log(`[content] ${snapshot.foods.length}개 ${command === "import" ? "반영" : "검증"} 완료 · 출처 확인 ${snapshot.checkedAt}`);
} catch (error) {
  console.error(`[content] ${(error as Error).message}`);
  process.exitCode = 1;
}
