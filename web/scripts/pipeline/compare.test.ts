import assert from "node:assert/strict";
import { test } from "node:test";

test("모델 비교는 같은 제목을 두 모델에 보내고 데이터베이스에는 접속하지 않는다", async (t) => {
  const settings = {
    PIPELINE_COMPARE_MODELS: "true",
    PIPELINE_QUERIES: "음식",
    AI_PROVIDER: "openai",
    AI_MODEL: "gpt-5.4-mini",
    OPENAI_API_KEY: "test-key",
    YOUTUBE_API_KEY: "test-key",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
  };
  const previous = Object.entries(settings).map(([key]) => [key, process.env[key]] as const);
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const logs = t.mock.method(console, "log", () => {});
  const calls: { model: string; input: string; max_output_tokens: number }[] = [];
  t.mock.method(globalThis, "fetch", async (address: string, init?: RequestInit) => {
    const url = new URL(address);
    if (url.hostname === "www.googleapis.com") {
      return Response.json({ items: [{ id: { videoId: "video-1" }, snippet: { title: "버터떡 만들기" } }] });
    }
    assert.equal(url.href, "https://api.openai.com/v1/responses");
    calls.push(JSON.parse(String(init?.body)));
    const foods = [{ name: "버터떡", category: "간식", mentions: 1 }];
    return Response.json({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ foods }) }] }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
  });

  await import("./run.ts");
  assert.deepEqual(calls.map((call) => call.model), ["gpt-5.4-mini", "gpt-6-astra"]);
  assert.equal(calls[0].input, calls[1].input);
  assert.equal(calls[0].input.match(/버터떡 만들기/g)?.length, 1);
  assert.ok(calls.every((call) => call.max_output_tokens === 4096));
  assert.equal(logs.mock.calls.filter((call) => call.arguments[1] === "모델 비교").length, 2);
});
