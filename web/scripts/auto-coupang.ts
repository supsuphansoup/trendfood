import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { parseContent } from "../src/data/content.ts";
import { aiConfig, askJson } from "./pipeline/llm.ts";
import { automaticLinks, coupangConfig, emptyLinkState, parseLinkState, searchProducts } from "./coupang-automation.ts";
import { directProductUrl, searchWebProducts } from "./web-products.ts";

async function atomic(path: string, value: unknown) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}

async function main() {
  const preview = process.argv.includes("--dry-run");
  const webProducts = process.argv.includes("--web-products");
  const reportPath = webProducts ? "data/product-link-report.json" : "data/coupang-report.json";
  const statePath = webProducts ? "data/product-link-state.json" : "data/coupang-state.json";
  const checkedAt = new Date().toISOString();
  await mkdir("data", { recursive: true });
  const config = webProducts ? null : coupangConfig();
  const ai = aiConfig();
  if (webProducts ? !ai || ai.provider !== "openai" : !config || !ai) {
    const reason = webProducts ? "일반 상품 검색용 OpenAI 공급자·모델·키 미설정" : !config ? "쿠팡 API 키·등록 채널 ID 미설정" : "AI 공급자·모델·키 미설정";
    await atomic(reportPath, { checkedAt, preview, status: "skipped", reason, accepted: [], deferred: [] });
    console.log(`[links:auto] 건너뜀: ${reason}. 기존 링크·검색 연결을 유지해요`);
    return;
  }
  const target = "src/data/content/foods.json";
  const current = parseContent(JSON.parse(await readFile(target, "utf8")));
  const state = await readFile(statePath, "utf8").then((raw) => parseLinkState(JSON.parse(raw))).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return emptyLinkState();
    throw error;
  });
  const result = await automaticLinks(current, state, {
    search: webProducts ? searchWebProducts : (query) => searchProducts(query, config!),
    validUrl: webProducts ? (url, id) => {
      const canonical = directProductUrl(url);
      return canonical !== null && canonical === url && Number(new URL(canonical).pathname.split("/").at(-1)) === id;
    } : undefined,
    choose: (prompt, schema) => askJson(prompt, schema, aiConfig()?.provider === "openai" ? { model: aiConfig()!.model, maxOutputTokens: 1200 } : undefined),
    persist: (value) => atomic(statePath, value),
  });
  await atomic(reportPath, { checkedAt, preview, status: "checked", ...(webProducts ? { mode: "indexed-product", affiliate: false } : {}), accepted: result.accepted, deferred: result.deferred, remaining: result.remaining });
  if (!preview && result.accepted.length) await atomic(target, parseContent(result.snapshot));
  console.log(`[links:auto] 상품 ${result.accepted.length}종 · 재료 링크 ${result.accepted.reduce((sum, item) => sum + item.count, 0)}개 · 보류 ${result.deferred.length}종${preview ? " (미리보기, 공개 파일 변경 없음)" : ""}`);
}

main().catch(() => { console.error("[links:auto] 설정·호출 기록·저장 실패. 키·응답 원문을 출력하지 않습니다"); process.exitCode = 1; });
