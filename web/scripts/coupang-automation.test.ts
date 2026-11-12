import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ContentSnapshot } from "../src/data/content.ts";
import { affiliateProductUrl, authorization, automaticLinks, coupangConfig, CoupangStopError, emptyLinkState, parseLinkState, reserveSearch, searchProducts } from "./coupang-automation.ts";

const now = new Date("2026-11-12T01:17:00Z");
const config = { accessKey: "test-access", secretKey: "test-secret", subId: "trendfood" };
const product = { id: 123, name: "무염 버터 200g", url: "https://link.coupang.com/re/AFFSDP?pageKey=123&subid=trendfood" };
const verdict = { candidateIndex: 0, sameIngredient: true, foodProduct: true, confidence: 0.99 };
const input = JSON.parse(await readFile(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const current = (): ContentSnapshot => ({ ...structuredClone(input), foods: [
  { ...structuredClone(input.foods[0]), ingredients: [{ name: "무염 버터", amount: "20g" }, { name: "설탕", amount: "10g", url: "https://link.coupang.com/a/Manual" }] },
  { ...structuredClone(input.foods[1]), ingredients: [{ name: "무염 버터", amount: "30g" }] },
] });
afterEach(() => mock.restoreAll());

test("쿠팡 설정·호출 기록: 부분 설정·잘못된 채널·손상 기록을 거절한다", () => {
  assert.equal(coupangConfig({}), null);
  assert.deepEqual(coupangConfig({ COUPANG_ACCESS_KEY: "test-access", COUPANG_SECRET_KEY: "test-secret", COUPANG_SUB_ID: "trendfood" }), config);
  for (const env of [{ COUPANG_ACCESS_KEY: "private-value" }, { COUPANG_ACCESS_KEY: "private-value", COUPANG_SECRET_KEY: "private-secret", COUPANG_SUB_ID: "등록 안 된 값" }]) {
    assert.throws(() => coupangConfig(env), (error: Error) => !error.message.includes("private"));
  }
  assert.deepEqual(parseLinkState(emptyLinkState()), emptyLinkState());
  for (const bad of [null, {}, { ...emptyLinkState(), calls: [-1] }, { ...emptyLinkState(), attempted: [] }, { ...emptyLinkState(), attempted: { test: "wrong" } }]) assert.throws(() => parseLinkState(bad));
});

test("쿠팡 HMAC: 독립적인 Python 기준값과 UTC 서명이 일치한다", () => {
  const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search";
  const query = "keyword=%EC%95%BD%EA%B3%BC&limit=10&subId=trendfood&srpLinkOnly=false";
  assert.equal(authorization(config, "GET", path, query, now), "CEA algorithm=HmacSHA256, access-key=test-access, signed-date=261112T011700Z, signature=7aa87bb3a1f4d3292e4053e446d4897a07d32dd8a21c53375e24469403d7f954");
});

test("쿠팡 상품 링크: 검색·위장 호스트·다른 상품·다른 채널을 거절한다", () => {
  assert.equal(affiliateProductUrl(product.url, 123, "trendfood"), true);
  assert.equal(affiliateProductUrl("https://coupa.ng/abc123", 123), true);
  for (const bad of ["https://link.coupang.com.evil.test/re/AFFSDP", "https://www.coupang.com/np/search?q=버터", "https://link.coupang.com/re/AFFSRP", "http://coupa.ng/abc123", "https://user@link.coupang.com/a/abc", "https://link.coupang.com:444/a/abc", `${product.url}#fake`, product.url.replace("123", "456"), product.url.replace("trendfood", "other")]) {
    assert.equal(affiliateProductUrl(bad, 123, "trendfood"), false, bad);
  }
});

test("쿠팡 공식 호스트 요청: 등록 채널·서명·제한과 실제 상품 URL만 사용한다", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.origin, "https://api-gateway.coupang.com");
    assert.equal(parsed.pathname, "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search");
    assert.equal(parsed.searchParams.get("keyword"), "무염 버터");
    assert.equal(parsed.searchParams.get("subId"), "trendfood");
    assert.equal(parsed.searchParams.get("limit"), "10");
    assert.equal(parsed.searchParams.get("srpLinkOnly"), "false");
    assert.equal(init?.redirect, "error");
    assert.match((init?.headers as Record<string, string>).Authorization, /signed-date=261112T011700Z/);
    const row = { productId: 123, productName: product.name, productUrl: product.url, productPrice: 9999, productImage: "https://image.example/test.jpg" };
    return Response.json({ rCode: "0", data: { landingUrl: "https://link.coupang.com/re/AFFSRP", productData: [row, row, { ...row, productId: -1 }, { ...row, productId: 456, productUrl: "https://evil.test/x" }, null] } });
  });
  assert.deepEqual(await searchProducts("무염 버터", config, now), [product]);
  assert.equal(fetch.mock.callCount(), 1);
});

test("쿠팡 API 오류: 인증·한도·정상 HTTP의 실패 본문·연결 실패를 재시도하지 않는다", async (t) => {
  for (const status of [401, 403, 429, 500]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ message: "private-response" }, { status }));
    await assert.rejects(searchProducts("버터", config, now), (error: CoupangStopError) => error instanceof CoupangStopError && error.cooldown === (status === 429 || status === 403) && !error.message.includes("private-response"));
    assert.equal(fetch.mock.callCount(), 1); fetch.mock.restore();
  }
  for (const body of [{ rCode: "400" }, { code: "ERROR" }, { rCode: "0", data: { productData: null } }]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => Response.json(body));
    await assert.rejects(searchProducts("버터", config, now), CoupangStopError); fetch.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new Error("private-network-details"); });
  await assert.rejects(searchProducts("버터", config, now), /연결 실패/);
});

test("쿠팡 호출 제한: 실패·미리보기 포함 시간당 5회와 중단 기간을 지킨다", () => {
  const state = emptyLinkState();
  for (let i = 0; i < 5; i++) reserveSearch(state, `query-${i}`, now.getTime());
  assert.throws(() => reserveSearch(state, "extra", now.getTime() + 1000), CoupangStopError);
  reserveSearch(state, "next-hour", now.getTime() + 3_600_001);
  assert.equal(state.calls.length, 1);
  state.blockedUntil = now.getTime() + 86_400_000;
  assert.throws(() => reserveSearch(state, "blocked", now.getTime() + 3_600_002), CoupangStopError);
});

test("자동 링크: 실제 검색 상품 하나를 중복 재료에 연결하고 수동 링크·날짜·원본은 보존한다", async () => {
  const original = current();
  const before = structuredClone(original);
  const state = emptyLinkState();
  let persisted = 0, searches = 0;
  const dependencies = {
    persist: async () => { persisted++; },
    search: async (query: string) => { assert.equal(persisted, 1); assert.equal(query, "무염 버터"); searches++; return [product]; },
    choose: async (prompt: string) => { assert.match(prompt, /20g/); assert.match(prompt, /30g/); return verdict; },
  };
  const result = await automaticLinks(original, state, dependencies, now);
  assert.equal(searches, 1); assert.equal(result.accepted[0].count, 2);
  assert.equal(result.snapshot.foods[0].ingredients[0].url, product.url);
  assert.equal(result.snapshot.foods[1].ingredients[0].url, product.url);
  assert.equal(result.snapshot.foods[0].ingredients[1].url, before.foods[0].ingredients[1].url);
  assert.equal(result.snapshot.checkedAt, before.checkedAt);
  assert.deepEqual(result.snapshot.foods[0].steps, before.foods[0].steps);
  assert.deepEqual(original, before);
  const again = await automaticLinks(result.snapshot, state, dependencies, now);
  assert.equal(again.accepted.length, 0); assert.equal(searches, 1);
});

test("자동 링크: 불일치·비식품·낮은 신뢰·NaN·없는 인덱스·null은 연결하지 않는다", async () => {
  for (const reply of [null, { ...verdict, sameIngredient: false }, { ...verdict, foodProduct: false }, { ...verdict, confidence: 0.94 }, { ...verdict, confidence: NaN }, { ...verdict, confidence: 2 }, { ...verdict, candidateIndex: -1 }, { ...verdict, candidateIndex: 2 }, { ...verdict, candidateIndex: 0.5 }]) {
    const original = current();
    const result = await automaticLinks(original, emptyLinkState(), { persist: async () => {}, search: async () => [product], choose: async () => reply }, now);
    assert.equal(result.accepted.length, 0); assert.deepEqual(result.snapshot, original);
  }
});

test("자동 링크: 같은 재료도 필요량별로 다른 포장을 연결하고 최소 용량부터 대조한다", async () => {
  const original = current();
  original.foods[0].ingredients[0].amount = "47g";
  original.foods[1].ingredients[0].amount = "400g";
  let searches = 0, choices = 0;
  const products = [5000, 500, 100].map((g) => ({ id: g, name: `무염 버터 ${g}g, 1개`, url: `https://link.coupang.com/re/AFFSDP?pageKey=${g}` }));
  const result = await automaticLinks(original, emptyLinkState(), {
    persist: async () => {}, search: async (_, contexts) => { searches++; assert.equal(contexts.length, 2); return products; },
    choose: async (prompt) => { choices++; assert.doesNotMatch(prompt, /5000g/); return verdict; },
  }, now);
  assert.equal(searches, 1); assert.equal(choices, 2);
  assert.equal(result.snapshot.foods[0].ingredients[0].url, products[2].url);
  assert.equal(result.snapshot.foods[1].ingredients[0].url, products[1].url);
  assert.equal(result.remaining, 0);
});

test("자동 링크: 용량 불명·부족·업소용만 있으면 AI가 승인해도 연결하지 않는다", async () => {
  for (const title of ["무염 버터", "무염 버터 10g", "무염 버터 5kg", "무염 버터 200g, 6개"]) {
    const original = current();
    let choices = 0;
    const result = await automaticLinks(original, emptyLinkState(), { persist: async () => {}, search: async () => [{ ...product, name: title }], choose: async () => { choices++; return verdict; } }, now);
    assert.equal(choices, 0); assert.deepEqual(result.snapshot, original); assert.equal(result.accepted.length, 0);
  }
});

test("자동 링크: 다른 상품·비식품·복수 선택 재료는 자동 선택하지 않는다", async () => {
  const original = current();
  original.foods[0].ingredients.push({ name: "우유 또는 생크림", amount: "20ml" });
  let choices = 0, searches = 0;
  const result = await automaticLinks(original, emptyLinkState(), { persist: async () => {}, search: async () => {
    searches++; return [{ ...product, name: "무염 버터 모형 소품" }, { ...product, name: "가염 버터" }, { ...product, url: "https://evil.test" }];
  }, choose: async () => { choices++; return verdict; } }, now);
  assert.equal(searches, 1); assert.equal(choices, 0); assert.deepEqual(result.snapshot, original);
});

test("자동 링크: 미발견 재료도 순환하고 한도 오류 뒤에는 추가 요청하지 않는다", async () => {
  const original = current();
  original.foods = [{ ...original.foods[0], ingredients: Array.from({ length: 15 }, (_, i) => ({ name: `재료${i}`, amount: "1개" })) }];
  const state = emptyLinkState(), seen = new Set<string>();
  const dependencies = { persist: async () => {}, search: async (query: string) => { seen.add(query); return []; }, choose: async () => verdict };
  for (let day = 0; day < 3; day++) await automaticLinks(original, state, dependencies, new Date(now.getTime() + day * 86_400_000));
  assert.equal(seen.size, 15);
  let calls = 0, saves = 0;
  const blocked = emptyLinkState();
  const result = await automaticLinks(original, blocked, { ...dependencies, persist: async () => { saves++; }, search: async () => { calls++; throw new CoupangStopError("한도", true); } }, now);
  assert.equal(calls, 1); assert.equal(saves, 2); assert.equal(result.accepted.length, 0);
  assert.equal(blocked.blockedUntil, now.getTime() + 86_400_000);
});

test("자동 링크: 필요량 불명은 유료 검색 없이 보류하고 다음 재료로 순환한다", async () => {
  const original = current();
  original.foods = [{ ...original.foods[0], ingredients: [{ name: "소금", amount: "약간" }, { name: "무염 버터" }] }];
  const state = emptyLinkState();
  let searches = 0;
  const result = await automaticLinks(original, state, {
    persist: async () => {}, search: async () => { searches++; return [product]; }, choose: async () => verdict,
  }, now);
  assert.equal(searches, 0); assert.equal(state.calls.length, 0);
  assert.deepEqual(Object.values(state.attempted), [now.getTime(), now.getTime()]);
  assert.equal(result.deferred.length, 2); assert.equal(result.remaining, 0);
  assert.deepEqual(result.snapshot, original);
});

test("키 없는 링크 CLI는 건너뛰며 공개 콘텐츠를 바꾸지 않는다", async () => {
  const path = new URL("../src/data/content/foods.json", import.meta.url);
  const before = await readFile(path, "utf8");
  const result = spawnSync(process.execPath, ["scripts/auto-coupang.ts", "--dry-run"], { encoding: "utf8", env: { ...process.env, COUPANG_ACCESS_KEY: "", COUPANG_SECRET_KEY: "", COUPANG_SUB_ID: "" } });
  assert.equal(result.status, 0); assert.match(result.stdout, /건너뜀/);
  assert.equal(await readFile(path, "utf8"), before);
  const report = JSON.parse(await readFile(new URL("../data/coupang-report.json", import.meta.url), "utf8"));
  assert.equal(report.status, "skipped"); assert.deepEqual(report.accepted, []);
});

test("격리한 링크 CLI: 미리보기는 호출만 기록하고 적용·재실행은 공개 파일을 올바르게 저장한다", async () => {
  const workspace = await mkdtemp(resolve("data/coupang-cli-"));
  const target = resolve(workspace, "src/data/content/foods.json");
  await mkdir(resolve(workspace, "src/data/content"), { recursive: true });
  const original = JSON.stringify(current());
  await writeFile(target, original);
  const preload = resolve(workspace, "mock-api.mjs");
  await writeFile(preload, `
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://api-gateway.coupang.com/')) return Response.json({rCode:'0',data:{productData:[${JSON.stringify({ productId: product.id, productName: product.name, productUrl: product.url })}]}});
      if (String(url) === 'https://api.openai.com/v1/responses') return Response.json({output:[{type:'message',content:[{type:'output_text',text:${JSON.stringify(JSON.stringify(verdict))}}]}]});
      throw new Error('테스트에서 실제 네트워크 요청을 허용하지 않아요');
    };
  `);
  const run = (args: string[]) => spawnSync(process.execPath, ["--import", pathToFileURL(preload).href, fileURLToPath(new URL("./auto-coupang.ts", import.meta.url)), ...args], {
    cwd: workspace, encoding: "utf8", env: { ...process.env, COUPANG_ACCESS_KEY: "test-access", COUPANG_SECRET_KEY: "test-secret", COUPANG_SUB_ID: "trendfood", AI_PROVIDER: "openai", AI_MODEL: "test-model", OPENAI_API_KEY: "test-key" },
  });
  const dry = run(["--dry-run"]);
  assert.equal(dry.status, 0, dry.stderr); assert.equal(await readFile(target, "utf8"), original);
  const ledger = resolve(workspace, "data/coupang-state.json");
  assert.equal(JSON.parse(await readFile(ledger, "utf8")).calls.length, 1);
  const applied = run([]);
  assert.equal(applied.status, 0, applied.stderr);
  const saved = JSON.parse(await readFile(target, "utf8")) as ContentSnapshot;
  assert.equal(saved.foods[0].ingredients[0].url, product.url);
  assert.equal(saved.foods[1].ingredients[0].url, product.url);
  assert.equal(saved.foods[0].ingredients[1].url, current().foods[0].ingredients[1].url);
  assert.equal(JSON.parse(await readFile(ledger, "utf8")).calls.length, 2);
  const again = run([]); assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(JSON.parse(await readFile(target, "utf8")), saved);
  assert.equal(JSON.parse(await readFile(ledger, "utf8")).calls.length, 2);
});
