import assert from "node:assert/strict";
import { test } from "node:test";

for (const scenario of [
  { name: "기본 먹방 수집", queries: undefined, expected: ["요즘 유행 먹방", "신상 디저트 먹방", "편의점 신상 먹방", "유행 디저트 만들기", "SNS 화제 레시피"] },
  { name: "검색어 직접 지정", queries: " 음식 , ", expected: ["음식"] },
]) test(`${scenario.name}: 검색 예산·최신 검색·제목 중복 제거를 유지하고 같은 입력으로 모델을 비교한다`, async (t) => {
  const settings = {
    PIPELINE_COMPARE_MODELS: "true",
    PIPELINE_QUERIES: scenario.queries,
    AI_PROVIDER: "openai",
    AI_MODEL: "gpt-5.4-mini",
    OPENAI_API_KEY: "test-key",
    YOUTUBE_API_KEY: "test-key",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
  };
  const previous = Object.entries(settings).map(([key]) => [key, process.env[key]] as const);
  Object.assign(process.env, settings);
  if (scenario.queries === undefined) delete process.env.PIPELINE_QUERIES;
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const logs = t.mock.method(console, "log", () => {});
  const calls: { model: string; input: string; max_output_tokens: number }[] = [];
  const searches: URLSearchParams[] = [];
  t.mock.method(globalThis, "fetch", async (address: string, init?: RequestInit) => {
    const url = new URL(address);
    if (url.hostname === "www.googleapis.com") {
      assert.equal(url.pathname, "/youtube/v3/search");
      searches.push(url.searchParams);
      return Response.json({ items: [{ id: { videoId: "video-1" }, snippet: { title: "신상 생초코모찌 먹방" } }] });
    }
    assert.equal(url.href, "https://api.openai.com/v1/responses");
    calls.push(JSON.parse(String(init?.body)));
    const foods = [{ name: "생초코모찌", category: "간식", mentions: 1 }];
    return Response.json({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ foods }) }] }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
  });

  await import(`./run.ts?scenario=${encodeURIComponent(scenario.name)}`);
  assert.deepEqual(searches.map((params) => [params.get("q"), params.get("order")]), scenario.expected.flatMap((query) => [
    [query, "viewCount"], [query, "date"],
  ]));
  assert.equal(searches.length, scenario.expected.length * 2);
  for (let i = 0; i < searches.length; i += 2) {
    const popularSince = Date.parse(searches[i].get("publishedAfter")!);
    const latestSince = Date.parse(searches[i + 1].get("publishedAfter")!);
    assert.ok(Math.abs(latestSince - popularSince - 5 * 86_400_000) < 1000);
  }
  assert.deepEqual(calls.map((call) => call.model), ["gpt-5.4-mini", "gpt-6-astra"]);
  assert.equal(calls[0].input, calls[1].input);
  assert.equal(calls[0].input.match(/신상 생초코모찌 먹방/g)?.length, 1);
  assert.ok(calls[0].input.includes("레시피가 없어도 후보에서 제외하지 마세요"));
  assert.ok(calls[0].input.includes("먹방에 등장했다는 이유만으로 유행을 확정하지 마세요"));
  assert.ok(calls.every((call) => call.max_output_tokens === 4096));
  assert.equal(logs.mock.calls.filter((call) => call.arguments[1] === "모델 비교").length, 2);
});
