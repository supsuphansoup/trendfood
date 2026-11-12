import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CoupangStopError } from "./coupang-automation.ts";
import { directProductUrl, searchWebProducts, sourcedProducts } from "./web-products.ts";

const url = "https://www.coupang.com/vp/products/123?itemId=456&vendorItemId=789";
const title = "무염 버터 200g";
const response = () => ({ status: "completed", output: [
  { type: "web_search_call", status: "completed", action: { type: "search", sources: [{ type: "url", url }] } },
  { type: "message", content: [{ type: "output_text", text: "사용하지 않는 AI 본문", annotations: [{ type: "url_citation", url, title }] }] },
] });
const configure = () => { process.env.AI_PROVIDER = "openai"; process.env.AI_MODEL = "configured-model"; process.env.OPENAI_API_KEY = "test-key"; };
const savedEnv = { ...process.env };
afterEach(() => { mock.restoreAll(); process.env = { ...savedEnv }; });

test("일반 상품 주소: 실제 상품·옵션만 보존하고 검색·제휴·외부·모호한 주소는 거절한다", () => {
  assert.equal(directProductUrl(`${url}&utm_source=chatgpt.com&clickEventId=tracking&subId=other`), url);
  for (const invalid of [null, "http://www.coupang.com/vp/products/123", "https://evil.test/vp/products/123", "https://www.coupang.com.evil.test/vp/products/123", "https://www.coupang.com/np/search?q=버터", "https://link.coupang.com/a/abc", `${url}#fragment`, "https://user@www.coupang.com/vp/products/123", "https://www.coupang.com:8080/vp/products/123", `${url}&itemId=999`, "https://www.coupang.com/vp/products/0", "https://www.coupang.com/vp/products/9007199254740992", "https://www.coupang.com/vp/products/123?itemId=bad"]) assert.equal(directProductUrl(invalid), null, String(invalid));
});

test("검색 근거: 완료된 실제 검색 출처와 인용 제목이 함께 있는 상품만 허용한다", () => {
  assert.deepEqual(sourcedProducts(response()), [{ id: 123, name: title, url }]);
  const raw = response();
  raw.output[1].content![0].annotations.push({ type: "url_citation", url: "https://www.coupang.com/vp/products/999", title: "AI가 만든 상품" });
  raw.output[1].content![0].annotations.push({ type: "url_citation", url, title });
  assert.equal(sourcedProducts(raw).length, 1);
  assert.deepEqual(sourcedProducts({ output: raw.output.slice(1) }), []);
  raw.output[0].status = "failed";
  assert.deepEqual(sourcedProducts(raw), []);
  assert.deepEqual(sourcedProducts(null), []);
});

test("공식 검색 요청: 기존 모델·쿠팡 도메인·색인 전용·도구 1회·출처 목록을 고정한다", async (t) => {
  configure();
  const fetch = t.mock.method(globalThis, "fetch", async (endpoint: string | URL | Request, options: RequestInit) => {
    assert.equal(endpoint, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(options.body));
    assert.equal(body.model, "configured-model"); assert.equal(body.max_tool_calls, 1); assert.equal(body.tool_choice, "required");
    assert.deepEqual(body.include, ["web_search_call.action.sources"]);
    assert.deepEqual(body.tools, [{ type: "web_search", external_web_access: false, filters: { allowed_domains: ["www.coupang.com"] } }]);
    assert.match(body.input, /무염 버터/); assert.equal(options.redirect, "error"); assert.ok(options.signal);
    return Response.json(response());
  });
  assert.deepEqual(await searchWebProducts("무염 버터"), [{ id: 123, name: title, url }]);
  assert.equal(fetch.mock.callCount(), 1);
});

test("검색 실패: 한도·오류·미완료 응답·연결 오류를 숨기고 재시도하지 않는다", async (t) => {
  configure();
  for (const status of [400, 403, 429, 500]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ error: "private-response" }, { status }));
    await assert.rejects(searchWebProducts("버터"), (error: CoupangStopError) => error instanceof CoupangStopError && error.cooldown === (status === 403 || status === 429) && !error.message.includes("private-response"));
    assert.equal(fetch.mock.callCount(), 1); fetch.mock.restore();
  }
  for (const body of [null, {}, { ...response(), status: "incomplete" }, { ...response(), error: { message: "private-response" } }]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => Response.json(body));
    await assert.rejects(searchWebProducts("버터"), /응답/); fetch.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new Error("private-network-details"); });
  await assert.rejects(searchWebProducts("버터"), /연결 실패/);
});

test("다른 공급자·키 미설정은 검색을 호출하지 않는다", async (t) => {
  configure();
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("호출 금지"); });
  process.env.OPENAI_API_KEY = "";
  await assert.rejects(searchWebProducts("버터"), /설정/);
  process.env.AI_PROVIDER = "gemini"; process.env.GEMINI_API_KEY = "test-key";
  await assert.rejects(searchWebProducts("버터"), /설정/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("일반 상품 CLI: 파트너스 키 없이 검색·대조하고 미리보기·수동 링크·재실행을 보존한다", async () => {
  const workspace = await mkdtemp(resolve("data/web-products-cli-"));
  const target = resolve(workspace, "src/data/content/foods.json");
  await mkdir(resolve(workspace, "src/data/content"), { recursive: true });
  const content = JSON.parse(await readFile(new URL("../src/data/content/foods.json", import.meta.url), "utf8"));
  const manual = "https://www.coupang.com/vp/products/321";
  content.foods = [{ ...content.foods[0], ingredients: [{ name: "무염 버터", amount: "20g" }, { name: "설탕", amount: "10g", url: manual }] }];
  const original = JSON.stringify(content);
  await writeFile(target, original);
  const preload = resolve(workspace, "mock-api.mjs");
  await writeFile(preload, `globalThis.fetch = async (url, options) => {
    if (String(url) !== 'https://api.openai.com/v1/responses') throw new Error('쿠팡 직접 요청 금지');
    if (JSON.parse(options.body).tools) return Response.json(${JSON.stringify(response())});
    return Response.json({output:[{type:'message',content:[{type:'output_text',text:'{"candidateIndex":0,"sameIngredient":true,"foodProduct":true,"confidence":0.99}'}]}]});
  };`);
  const run = (args: string[], env = {}) => spawnSync(process.execPath, ["--import", pathToFileURL(preload).href, fileURLToPath(new URL("./auto-coupang.ts", import.meta.url)), "--web-products", ...args], {
    cwd: workspace, encoding: "utf8", env: { ...process.env, COUPANG_ACCESS_KEY: "", COUPANG_SECRET_KEY: "", COUPANG_SUB_ID: "", AI_PROVIDER: "openai", AI_MODEL: "configured-model", OPENAI_API_KEY: "test-key", ...env },
  });
  const skipped = run([], { OPENAI_API_KEY: "" });
  assert.equal(skipped.status, 0, skipped.stderr); assert.match(skipped.stdout, /건너뜀/);
  assert.equal(await readFile(target, "utf8"), original);
  const dry = run(["--dry-run"]);
  assert.equal(dry.status, 0, dry.stderr); assert.equal(await readFile(target, "utf8"), original);
  const applied = run([]); assert.equal(applied.status, 0, applied.stderr);
  const saved = JSON.parse(await readFile(target, "utf8"));
  assert.equal(saved.foods[0].ingredients[0].url, url); assert.equal(saved.foods[0].ingredients[1].url, manual);
  assert.equal(saved.checkedAt, content.checkedAt); assert.deepEqual(saved.foods[0].steps, content.foods[0].steps);
  const ledger = resolve(workspace, "data/product-link-state.json");
  assert.equal(JSON.parse(await readFile(ledger, "utf8")).calls.length, 2);
  const again = run([]); assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(JSON.parse(await readFile(target, "utf8")), saved);
  assert.equal(JSON.parse(await readFile(ledger, "utf8")).calls.length, 2);
  const report = JSON.parse(await readFile(resolve(workspace, "data/product-link-report.json"), "utf8"));
  assert.equal(report.affiliate, false); assert.equal(report.mode, "indexed-product");
});
