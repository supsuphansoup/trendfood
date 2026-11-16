// 공식 API 만 쓴다 (CLAUDE.md: SNS·커뮤니티 크롤링, 영상 자막 추출 금지)
import { ymd } from "./logic.ts";

export type Video = { id: string; title: string; channelId?: string; publishedAt?: string };
export type RecipeVideo = Video & { description: string };

/** Google Trending now의 공식 RSS. 뉴스 급상승은 후보 힌트이며 음식 유행의 증거가 아니다. */
export function parseTrendingRss(xml: string): string[] {
  if (xml.length > 1_000_000 || !/<rss\b/.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("급상승 RSS 형식이 잘못됐어요");
  const plain = (text: string) => decodeEntities(text.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20).flatMap((item) => {
    const title = plain(item[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const news = [...item[1].matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].slice(0, 2).map((match) => plain(match[1]));
    const hint = [title, ...news].join(" · ").slice(0, 500);
    // 비음식 검색·사고 뉴스가 음식 유행 후보로 들어가는 것을 줄인다. 누락 가능성이 있는 보조 검색처다.
    return /먹방|디저트|편의점|신메뉴|신상|음식|쿠키|케이크|라떼|초콜릿|빵|떡|빙수/.test(hint) && !/식중독|리콜|사망|사고|위해식품/.test(hint) ? [`[급상승 검색 참고] ${hint}`] : [];
  });
}

export async function trendingRss(): Promise<string[]> {
  const response = await fetch("https://trends.google.com/trending/rss?geo=KR", { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Google RSS 오류 ${response.status}`);
  return parseTrendingRss(await response.text());
}

/** 확인한 음식 영상의 채널을 공식 업로드 재생목록으로 추적한다. 제목·원래 게시일만 읽는다. */
export async function channelUploads(ids: string[], key: string): Promise<Video[]> {
  const channels = [...new Set(ids)].filter((id) => /^UC[a-zA-Z0-9_-]{22}$/.test(id)).slice(0, 12);
  if (!channels.length) return [];
  const params = new URLSearchParams({ part: "contentDetails", id: channels.join(","), maxResults: "50", key });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`YouTube 채널 조회 오류 ${response.status}`);
  const body = await response.json() as { items?: { id: string; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] };
  const result: Video[] = [];
  for (const channel of body.items ?? []) {
    const playlist = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!channels.includes(channel.id) || !playlist || !/^[a-zA-Z0-9_-]+$/.test(playlist)) continue;
    const query = new URLSearchParams({ part: "snippet,contentDetails", playlistId: playlist, maxResults: "10", key });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${query}`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`YouTube 업로드 조회 오류 ${res.status}`);
    const data = await res.json() as { items?: { snippet?: { title?: string }; contentDetails?: { videoId?: string; videoPublishedAt?: string } }[] };
    for (const item of data.items ?? []) {
      const id = item.contentDetails?.videoId, title = item.snippet?.title, publishedAt = item.contentDetails?.videoPublishedAt;
      const age = Date.now() - Date.parse(publishedAt ?? "");
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id) && title && age >= 0 && age <= 7 * 86_400_000) result.push({ id, title: decodeEntities(title), channelId: channel.id, publishedAt });
    }
  }
  return result;
}

const entities: Record<string, string> = { "#39": "'", quot: '"', amp: "&", lt: "<", gt: ">" };
const decodeEntities = (s: string) => s.replace(/&(#39|quot|amp|lt|gt);/g, (m, e: string) => entities[e] ?? m);

/** YouTube Data API v3 search.list. 검색 쿼리 한도는 Google Cloud 콘솔에서 확인한다. */
export async function searchYoutube(query: string, key: string, days = 7, order: "viewCount" | "date" = "viewCount"): Promise<Video[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    regionCode: "KR",
    relevanceLanguage: "ko",
    order,
    maxResults: "25",
    publishedAfter: new Date(Date.now() - days * 86_400_000).toISOString(),
    key,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(30_000) });
  const body = (await res.json()) as {
    error?: { message?: string };
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelId?: string; publishedAt?: string } }[];
  };
  if (!res.ok) throw new Error(`YouTube 오류 ${res.status}: ${body.error?.message ?? ""}`);
  return (body.items ?? [])
    .filter((i) => i.id?.videoId && i.snippet?.title)
    .map((i) => ({ id: i.id!.videoId!, title: decodeEntities(i.snippet!.title!), ...(i.snippet!.channelId ? { channelId: i.snippet!.channelId } : {}), ...(i.snippet!.publishedAt ? { publishedAt: i.snippet!.publishedAt } : {}) }));
}

/** 공식 videos.list의 설명란만 읽는다. 자막·웹페이지·썸네일은 수집하지 않는다. */
export async function recipeDescriptions(ids: string[], key: string): Promise<RecipeVideo[]> {
  const unique = [...new Set(ids)].filter((id) => /^[a-zA-Z0-9_-]{11}$/.test(id));
  const videos: RecipeVideo[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const params = new URLSearchParams({ part: "snippet", id: unique.slice(i, i + 50).join(","), key });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`YouTube 설명란 조회 실패: ${response.status}`);
    const body = await response.json() as { items?: { id: string; snippet?: { title?: string; description?: string; channelId?: string; publishedAt?: string } }[] };
    for (const item of body.items ?? []) {
      if (item.snippet?.title) videos.push({
        id: item.id, title: decodeEntities(item.snippet.title), description: item.snippet.description ?? "",
        channelId: item.snippet.channelId, publishedAt: item.snippet.publishedAt,
      });
    }
  }
  return videos;
}

/**
 * 네이버 API HUB 검색어 트렌드 (한 번에 키워드 그룹 5개, HUB 안내 기준 월 50,000회).
 * 수집 1회마다 음식 후보 수 ÷ 5를 올림한 만큼 호출한다.
 * 문서 간 일 한도 충돌은 reports/트렌드푸드 인스타·네이버 데이터 조사.md 참고.
 * 값은 요청 안에서 가장 큰 값을 100으로 둔 상대값이라, 배수는 그룹마다 따로 계산해야 맞다.
 * 주소는 NAVER_DATALAB_URL 로 바꿀 수 있다.
 */
export async function naverTrend(names: string[], id: string, secret: string, days = 14): Promise<Map<string, number[]>> {
  const url = process.env.NAVER_DATALAB_URL || "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";
  const end = new Date(Date.now() - 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const out = new Map<string, number[]>();
  for (let i = 0; i < names.length; i += 5) {
    const group = names.slice(i, i + 5);
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: ymd(start),
        endDate: ymd(end),
        timeUnit: "date",
        keywordGroups: group.map((name) => ({ groupName: name, keywords: [...new Set([name, name.replace(/\s+/g, "")])] })),
      }),
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        error?: { errorCode?: string; message?: string; details?: string };
        errorCode?: string;
        errorMessage?: string;
        errMsg?: string;
      };
      const message = [error.error?.message, error.error?.details].filter(Boolean).join(": ")
        || error.errMsg || error.errorMessage || error.error?.errorCode || error.errorCode || res.statusText || "오류 설명 없음";
      const quota = res.status === 429 || error.error?.errorCode === "429" || error.errorCode === "429";
      throw new Error(`네이버 API HUB ${quota ? "한도 초과" : "오류"} ${res.status}: ${message}`);
    }
    const body = (await res.json()) as {
      results?: { title: string; data: { period: string; ratio: number }[] }[];
    };
    for (const r of body.results ?? []) {
      // 검색량이 없는 날은 응답에서 빠지므로 0으로 채운다
      const byDay = new Map(r.data.map((d) => [d.period, d.ratio]));
      const series = Array.from({ length: days }, (_, k) => byDay.get(ymd(new Date(start.getTime() + k * 86_400_000))) ?? 0);
      out.set(r.title, series);
    }
  }
  return out;
}
