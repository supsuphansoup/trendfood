import assert from "node:assert/strict";
import { test } from "node:test";
import { askJson, draftPrompt } from "./llm.ts";

test("AI 초안 프롬프트: 네이버 배수·영상 제목은 유지하고 YouTube 수치는 금지", () => {
  const prompt = draftPrompt("버터떡", 4.2, ["버터떡 만들기"]);
  assert.ok(prompt.includes("근거 수치: 네이버 검색량이 최근 3일 동안 평소의 4.2배."));
  assert.ok(prompt.includes("영상 개수·조회수·구독자 수 같은 YouTube 수치는 글에 쓰지 마세요."));
  assert.ok(prompt.includes("- 버터떡 만들기"));
  assert.ok(!prompt.includes("개에 등장"));
});

test("OpenAI 사용량: 입력·캐시·출력만 기록하고 원문과 응답 JSON은 기록하지 않는다", async (t) => {
  const settings = { AI_PROVIDER: "openai", AI_MODEL: "test-model", OPENAI_API_KEY: "test-key" };
  const previous = Object.entries(settings).map(([key]) => [key, process.env[key]] as const);
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const log = t.mock.method(console, "log", () => {});
  t.mock.method(globalThis, "fetch", async () => Response.json({
    output: [{ type: "message", content: [{ type: "output_text", text: '{"foods":[]}' }] }],
    usage: { input_tokens: 1200, input_tokens_details: { cached_tokens: 1024 }, output_tokens: 100 },
  }));
  assert.deepEqual(await askJson("예시 입력", {}), { foods: [] });
  assert.deepEqual(log.mock.calls.map((call) => call.arguments), [
    ["[openai-usage]", '{"model":"test-model","tokens":{"input":1200,"cachedInput":1024,"output":100}}'],
  ]);
});

test("이미지 검증은 선택한 공급자에 실제 이미지 바이트를 보내고 기존 텍스트 호출을 유지한다", async (t) => {
  const settings = { AI_PROVIDER: "openai", AI_MODEL: "test-model", OPENAI_API_KEY: "test-key", GEMINI_API_KEY: "test-key" };
  const previous = Object.keys(settings).map((key) => [key, process.env[key]] as const);
  Object.assign(process.env, settings);
  t.after(() => { for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  t.mock.method(console, "log", () => {});
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Response.json(process.env.AI_PROVIDER === "openai" ? { output: [{ content: [{ type: "output_text", text: "{}" }] }] } : { candidates: [{ content: { parts: [{ text: "{}" }] } }] });
  });
  await askJson("확인", {}, undefined, [{ mimeType: "image/webp", data: "dGVzdA==" }]);
  assert.deepEqual(bodies[0].input, [{ role: "user", content: [{ type: "input_text", text: "확인" }, { type: "input_image", image_url: "data:image/webp;base64,dGVzdA==", detail: "high" }] }]);
  process.env.AI_PROVIDER = "gemini";
  await askJson("확인", {}, undefined, [{ mimeType: "image/webp", data: "dGVzdA==" }]);
  assert.deepEqual((bodies[1].contents as { parts: unknown[] }[])[0].parts[1], { inline_data: { mime_type: "image/webp", data: "dGVzdA==" } });
  assert.equal(bodies[0].model, "test-model");
});
