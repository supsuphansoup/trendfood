// 공식 API 만 쓴다 (CLAUDE.md: SNS·커뮤니티 크롤링, 영상 자막 추출 금지)
import { ymd } from "./logic.ts";

export type Video = { id: string; title: string };

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
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const body = (await res.json()) as {
    error?: { message?: string };
    items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
  };
  if (!res.ok) throw new Error(`YouTube 오류 ${res.status}: ${body.error?.message ?? ""}`);
  return (body.items ?? [])
    .filter((i) => i.id?.videoId && i.snippet?.title)
    .map((i) => ({ id: i.id!.videoId!, title: decodeEntities(i.snippet!.title!) }));
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
