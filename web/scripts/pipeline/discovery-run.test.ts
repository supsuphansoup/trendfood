import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("실제 수집 진입점: 발견→음식명 재검색→네이버 보조 신호→원문 검증을 10검색·AI 4호출 안에서 미리보기한다", async (t) => {
  const previousArgs = [...process.argv];
  const previousDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "trendfood-discovery-"));
  const settings = {
    PIPELINE_COMPARE_MODELS: "false", PIPELINE_AUTO_PUBLISH: "true", PIPELINE_QUERIES: "발견1,발견2,발견3,발견4,초과5",
    AI_PROVIDER: "openai", AI_MODEL: "test-model", OPENAI_API_KEY: "test-key", YOUTUBE_API_KEY: "test-key",
    NAVER_API_HUB_KEY_ID: "test-key", NAVER_API_HUB_KEY: "test-key", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "",
    PIPELINE_DISCOVERY_STATE: join(directory, "data/discovery-state.json"),
  };
  const previous = Object.entries(settings).map(([key]) => [key, process.env[key]] as const);
  Object.assign(process.env, settings);
  process.argv.push("--dry-run");
  process.chdir(directory);
  t.after(() => {
    process.argv = previousArgs;
    process.chdir(previousDirectory);
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  t.mock.method(console, "log", () => {});
  let searches = 0, ai = 0, naver = 0;
  const foods = ["신상 초코모찌", "신상 버터쿠키", "신상 딸기라떼"].map((name) => ({ name, category: "디저트", mentions: 2 }));
  const snippets = foods.flatMap((food, index) => [0, 1].map((creator) => ({
    id: `Abcdef_12${index}${creator}`, snippet: { title: `${food.name} 먹방`, channelId: `UC${String(creator).repeat(22)}`, publishedAt: new Date(Date.now() - 86_400_000).toISOString(), description: `${food.name} 먹방` },
  })));
  t.mock.method(globalThis, "fetch", async (address: string | URL, init?: RequestInit) => {
    const url = new URL(String(address));
    if (url.hostname === "trends.google.com") return new Response("<rss><channel><item><title>정치 뉴스</title></item></channel></rss>");
    if (url.pathname.endsWith("/search" ) && url.hostname === "www.googleapis.com") {
      searches++;
      assert.ok(searches <= 10);
      return Response.json({ items: snippets.map((video) => ({ ...video, id: { videoId: video.id } })) });
    }
    if (url.pathname.endsWith("/videos")) {
      const ids = url.searchParams.get("id")!.split(",");
      return Response.json({ items: snippets.filter((video) => ids.includes(video.id)) });
    }
    if (url.hostname === "naverapihub.apigw.ntruss.com") {
      naver++;
      const body = JSON.parse(String(init?.body));
      return Response.json({ results: body.keywordGroups.map((group: { groupName: string }) => ({ title: group.groupName, data: [] })) });
    }
    assert.equal(url.href, "https://api.openai.com/v1/responses");
    ai++;
    const request = JSON.parse(String(init?.body));
    let result: unknown = { foods };
    if (ai > 1) {
      assert.equal(request.max_output_tokens, 6000);
      const food = foods.find((food) => request.input.includes(`음식 '${food.name}'`))!;
      const index = foods.indexOf(food);
      result = { complete: false, slug: `discovery-test-${index}`, introduction: { sourceId: snippets[index * 2].id, excerpt: snippets[index * 2].snippet.title } };
    }
    return Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(result) }] }] });
  });
  await import(`./run.ts?discovery-test=${Date.now()}`);
  assert.equal(process.exitCode ?? 0, 0);
  assert.equal(searches, 10);
  assert.equal(ai, 4);
  assert.equal(naver, 1);
  const report = JSON.parse(await readFile(join(directory, "data/automation-report.json"), "utf8"));
  assert.equal(report.preview, true);
  assert.equal(report.accepted.length, 3);
  const discovery = JSON.parse(await readFile(join(directory, "data/discovery-report.json"), "utf8"));
  assert.equal(discovery.searchCalls, 10);
  assert.equal(discovery.followed.length, 3);
  assert.equal(discovery.observations.length >= 3, true);
});
