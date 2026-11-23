import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parseContent } from "../../src/data/content.ts";
import { discoverVideos, emptyDiscovery, followCandidates, readDiscovery, readyPending, restorePending, retainPending } from "./discovery.ts";
import { channelUploads, parseTrendingRss, trendingRss, type Video } from "./sources.ts";

const date = "2026-11-16";
const current = parseContent(JSON.parse(await readFile(new URL("../../src/data/content/foods.json", import.meta.url), "utf8")));
const food = { name: "신상 초코모찌", category: "디저트" as const, mentions: 1 };
const videos: Video[] = [0, 1].map((i) => ({ id: `Abcdef_123${i}`, title: "신상 초코모찌 먹방", channelId: `UC${String(i).repeat(22)}`, publishedAt: "2026-11-15T01:00:00Z" }));

test("급상승 RSS는 공식 고정 주소를 쓰고 CDATA·뉴스 제목을 읽되 비음식·사고·외부 엔티티는 제외한다", async (t) => {
  const xml = '<rss><channel><item><title>정치 뉴스</title></item><item><title><![CDATA[초코모찌]]></title><ht:news_item_title>신상 디저트 &amp; 먹방</ht:news_item_title></item><item><title>빵 식중독</title></item></channel></rss>';
  assert.deepEqual(parseTrendingRss(xml), ["[급상승 검색 참고] 초코모찌 · 신상 디저트 & 먹방"]);
  assert.throws(() => parseTrendingRss('<!DOCTYPE rss SYSTEM "file:///secret"><rss/>'));
  assert.throws(() => parseTrendingRss("<html>오류</html>"));
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://trends.google.com/trending/rss?geo=KR");
    return new Response(xml);
  });
  assert.deepEqual(await trendingRss(), parseTrendingRss(xml));
});

test("채널 추적은 공식 업로드 목록의 실제 게시일을 쓰고 삭제·오래된 영상을 제외한다", async (t) => {
  const seen: string[] = [];
  const channel = videos[0].channelId!;
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://www.googleapis.com");
    seen.push(url.pathname);
    if (url.pathname.endsWith("/channels")) {
      assert.equal(url.searchParams.get("id"), channel);
      return Response.json({ items: [{ id: channel, contentDetails: { relatedPlaylists: { uploads: "UUtest" } } }] });
    }
    assert.equal(url.searchParams.get("part"), "snippet,contentDetails");
    assert.equal(url.searchParams.get("maxResults"), "10");
    const item = (id: string, publishedAt: string) => ({ snippet: { title: food.name, publishedAt: new Date().toISOString() }, contentDetails: { videoId: id, videoPublishedAt: publishedAt } });
    return Response.json({ items: [item(videos[0].id, new Date(Date.now() - 86_400_000).toISOString()), item(videos[1].id, "2020-01-01T00:00:00Z"), { snippet: { title: "삭제된 영상" } }] });
  });
  const result = await channelUploads([channel, channel, "잘못된 채널"], "test");
  assert.deepEqual(result.map((video) => video.id), [videos[0].id]);
  assert.equal(result[0].channelId, channel);
  assert.equal(seen.length, 2);
});

test("발견 검색 4회와 음식명 재검색 6회로 한도를 지키고 기존 음식은 재검색하지 않는다", async () => {
  const state = emptyDiscovery();
  let calls = 0;
  const queries: string[] = [];
  const search = async (query: string) => { calls++; queries.push(query); return videos; };
  const broad = await discoverVideos(["먹방", "편의점", "카페", "신상", "초과 검색"], state, date, {
    search, uploads: async () => videos, rss: async () => ["RSS 힌트"],
  });
  assert.equal(broad.searchCalls, 4);
  assert.equal(broad.videos.length, 2);
  assert.deepEqual(broad.titles, [videos[0].title, "RSS 힌트"]);
  const candidates = [food, { ...food, name: "새 쿠키" }, { ...food, name: "새 라떼" }, { ...food, name: current.foods[0].name }];
  const follow = await followCandidates(candidates, broad.videos, state, current, date, search);
  assert.equal(calls, 10);
  assert.equal(follow.searchCalls, 6);
  assert.equal(queries.includes(current.foods[0].name), false);
  assert.equal(follow.state.observations.find((item) => item.name === food.name)!.stage, "여러 제작자 확인");
  assert.equal(follow.state.channels.length, 2);
  assert.equal(follow.videos.length, 2);
  const again = await followCandidates(candidates, videos, follow.state, current, date, search);
  assert.equal(again.state.observations[0].days.length, 1);
  const tomorrow = await followCandidates([], videos, follow.state, current, "2026-11-17", search);
  assert.equal(tomorrow.state.observations[0].firstSeen, date);
  assert.deepEqual(tomorrow.state.observations[0].days, [date, "2026-11-17"]);
  assert.deepEqual(tomorrow.state.observations[0].history.map((item) => item.date), [date, "2026-11-17"]);
});

test("사진 대기 소개도 출처의 삭제·편집·게시일을 다시 확인해 근거가 사라진 원고는 공개하지 않는다", async () => {
  const draft = { ...current.foods[0], kind: "discovery" as const, slug: "cached-intro", name: food.name, image: "pending", heroImage: undefined,
    summary: `원문 소개: “${videos[0].title}”`, ingredients: [], steps: [], cookMinutes: 0,
    sources: videos.map((video) => ({ title: video.title, url: `https://www.youtube.com/watch?v=${video.id}` })),
  };
  const state = retainPending(emptyDiscovery(), { ...current, foods: [...current.foods, draft] }, current, date);
  const details = videos.map((video) => ({ ...video, description: "" }));
  const checked = await readyPending(state, date, async (ids) => { assert.equal(ids.length, 2); return details; });
  assert.equal(checked.pending.length, 1);
  assert.deepEqual(checked.signals, [{ name: draft.name, category: draft.category, mentions: 2, multiplier: 1, recent: true, trend: [], score: 2 }]);
  assert.deepEqual((await readyPending(state, date, async () => [...details, ...details])).signals, checked.signals);
  for (const changed of [details.slice(0, 1), details.map((item) => ({ ...item, title: "다른 음식" })), details.map((item) => ({ ...item, publishedAt: "2026-10-01T01:00:00Z" }))]) {
    const rejected = await readyPending(state, date, async () => changed);
    assert.equal(rejected.pending.length, 0);
    assert.equal(rejected.signals.length, 0);
  }
  assert.equal(state.pending.length, 1);
});

test("RSS·채널 장애는 보고하면서 검색을 계속하고 관찰 기록은 29일 만료·미확인 후보는 순환 재검사한다", async () => {
  const result = await discoverVideos(["먹방"], emptyDiscovery(), date, {
    search: async () => videos, uploads: async () => { throw new Error("연결 실패"); }, rss: async () => { throw new Error("RSS 실패"); },
  });
  assert.equal(result.warnings.length, 2);
  assert.equal(result.videos.length, 2);
  const initial = await followCandidates(Array.from({ length: 5 }, (_, index) => ({ ...food, name: `새 음식 ${index}` })), [], emptyDiscovery(), current, date, async () => []);
  const next = await followCandidates([], [], initial.state, current, "2026-11-17", async () => []);
  assert.deepEqual(next.selected.slice(0, 2), ["새 음식 3", "새 음식 4"]);
  const expired = readDiscovery(initial.state, "2026-12-15");
  assert.equal(expired.observations.length, 0);
});

test("사진 대기 원고는 공개에서 제외해도 보존하고 다음 실행에 복원하며 공개·29일 만료 때 제거한다", () => {
  const draft = { ...current.foods[0], slug: "pending-food", name: food.name, image: "pending", heroImage: undefined };
  const incoming = { ...current, foods: [...current.foods, draft] };
  const state = retainPending(emptyDiscovery(), incoming, current, date);
  assert.equal(state.pending.length, 1);
  assert.equal(current.foods.some((item) => item.slug === draft.slug), false);
  assert.deepEqual(restorePending(current, state).foods.at(-1), draft);
  assert.equal(restorePending(incoming, state).foods.length, incoming.foods.length);
  assert.equal(retainPending(state, incoming, incoming, date).pending.length, 0);
  assert.equal(readDiscovery(state, "2026-12-15").pending.length, 0);
  const again = retainPending(state, incoming, current, "2026-11-17");
  assert.equal(again.pending[0].savedAt, date);
});
