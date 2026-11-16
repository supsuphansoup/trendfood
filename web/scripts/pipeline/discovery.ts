import { candidateIdentity, normalizeName } from "../../src/data/candidates.ts";
import { parseContent, type ContentFood, type ContentSnapshot } from "../../src/data/content.ts";
import { cleanExtracted, type Extracted } from "./logic.ts";
import type { RecipeVideo, Video } from "./sources.ts";

type Observation = Extracted & { firstSeen: string; lastSeen: string; lastChecked?: string; days: string[]; history: { date: string; creators: number; videos: number }[]; creators: number; stage: "새로 포착" | "여러 제작자 확인" };
export type DiscoveryState = { version: 1; observations: Observation[]; channels: { id: string; seenAt: string }[]; pending: { food: ContentFood; savedAt: string }[] };
export const emptyDiscovery = (): DiscoveryState => ({ version: 1, observations: [], channels: [], pending: [] });
const validDay = (day: unknown): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
const active = (day: unknown, date: string) => validDay(day) && day <= date && Date.parse(date) - Date.parse(day) < 29 * 86_400_000;
export const matchingVideos = <T extends Video>(name: string, videos: T[]): T[] => videos.filter((video) => normalizeName(video.title).includes(normalizeName(name)));

/** 원문 데이터를 쌓지 않고, 29일 미만의 관찰과 미공개 원고만 남긴다. */
export function readDiscovery(raw: unknown, date: string): DiscoveryState {
  if (!raw || typeof raw !== "object" || !("version" in raw) || raw.version !== 1) throw new Error("발견 기록 형식이 잘못됐어요");
  const source = raw as DiscoveryState;
  if (![source.observations, source.channels, source.pending].every(Array.isArray)) throw new Error("발견 기록 배열이 잘못됐어요");
  const observations = source.observations.filter((item) => active(item.lastSeen, date) && validDay(item.firstSeen) && item.firstSeen <= item.lastSeen && cleanExtracted({ foods: [item] }).length && Array.isArray(item.days))
    .map((item) => ({ ...item, days: [...new Set(item.days.filter((day) => active(day, date)))].slice(-29), history: (item.history ?? []).filter((item) => active(item.date, date)).slice(-29) })).slice(-100);
  const channels = source.channels.filter((item) => /^UC[a-zA-Z0-9_-]{22}$/.test(item.id) && active(item.seenAt, date)).slice(-50);
  const pending = source.pending.filter((item) => active(item.savedAt, date)).flatMap((item) => {
    try { return [{ savedAt: item.savedAt, food: parseContent({ version: 1, status: "ready", checkedAt: item.savedAt, foods: [item.food] }).foods[0] }]; }
    catch { return []; }
  }).slice(-30);
  return { version: 1, observations, channels, pending };
}

/** 일반 검색 4회, 음식명 추가 검색 6회로 나눈다. */
export async function discoverVideos(queries: string[], state: DiscoveryState, date: string, deps: {
  search: (query: string, days: number, order: "date" | "viewCount") => Promise<Video[]>;
  uploads: (ids: string[]) => Promise<Video[]>;
  rss: () => Promise<string[]>;
}) {
  const warnings: string[] = [];
  let channels: Video[] = [], rss: string[] = [];
  const start = state.channels.length ? Math.floor(Date.parse(date) / 86_400_000) * 12 % state.channels.length : 0;
  const watched = [...state.channels.slice(start), ...state.channels.slice(0, start)].slice(0, 12);
  try { channels = await deps.uploads(watched.map((item) => item.id)); }
  catch (error) { warnings.push(`채널 추적: ${(error as Error).message}`); }
  try { rss = await deps.rss(); } catch (error) { warnings.push(`급상승 RSS: ${(error as Error).message}`); }
  const groups: Video[][] = [];
  for (const query of queries.slice(0, 4)) groups.push(await deps.search(query, 7, "date"));
  const broad = groups.flat();
  // 입력 제목 수를 제한해 추가 수집이 AI 입력의 무제한 증가로 이어지지 않게 한다.
  const videos = [...new Map([...channels, ...broad].map((video) => [video.id, video])).values()];
  const sample = (groups: Video[][], limit: number) => {
    const result: Video[] = [];
    for (let i = 0; result.length < limit && groups.some((group) => group.length > i); i++) {
      for (const group of groups) if (group[i] && result.length < limit) result.push(group[i]);
    }
    return result;
  };
  const hints = rss.slice(0, 10);
  const channelGroups = [...new Set(channels.map((video) => video.channelId))].map((id) => channels.filter((video) => video.channelId === id));
  const watchedTitles = sample(channelGroups, Math.floor((70 - hints.length) / 2));
  const titles = [...new Set([...watchedTitles, ...sample(groups, 70 - hints.length - watchedTitles.length)].map((video) => video.title)), ...hints];
  return { videos, titles, warnings, searchCalls: Math.min(4, queries.length), watchedChannels: Math.min(12, state.channels.length), rssItems: rss.length, date };
}

/** 기존 음식을 제외하고, 아직 확인하지 않은 후보부터 최대 3개를 이름으로 재검색한다. */
export async function followCandidates(extracted: Extracted[], videos: Video[], state: DiscoveryState, current: ContentSnapshot, date: string,
  search: (query: string, days: number, order: "date" | "viewCount") => Promise<Video[]>) {
  const known = new Set(current.foods.map((food) => candidateIdentity(food.name)));
  const candidates = [...new Map([...state.observations.filter((item) => Date.parse(date) - Date.parse(item.lastSeen) <= 7 * 86_400_000), ...extracted].map((item) => [candidateIdentity(item.name), item])).values()];
  const observations = new Map(state.observations.map((item) => [candidateIdentity(item.name), item]));
  const selected = candidates.filter((item) => !known.has(candidateIdentity(item.name)) && !state.pending.some(({ food }) => candidateIdentity(food.name) === candidateIdentity(item.name)))
    .sort((a, b) => (observations.get(candidateIdentity(a.name))?.lastChecked ?? "").localeCompare(observations.get(candidateIdentity(b.name))?.lastChecked ?? "") || b.mentions - a.mentions).slice(0, 3);
  const found = [...videos];
  for (const item of selected) {
    // 음식명을 API 검색 연산자로 해석하지 않게 한다. 표기 차이는 공백 정규화로만 대조한다.
    const query = item.name.replace(/[|"<>]/g, " ").trim();
    found.push(...await search(query, 7, "date"), ...await search(query, 7, "viewCount"));
  }
  const merged = [...new Map(found.map((video) => [video.id, video])).values()];
  for (const item of candidates) {
    const key = candidateIdentity(item.name);
    const prior = observations.get(key);
    const related = matchingVideos(item.name, merged).filter((video) => {
      const age = Date.parse(`${date}T23:59:59Z`) - Date.parse(video.publishedAt ?? "");
      return age >= 0 && age <= 8 * 86_400_000;
    });
    if (!related.length && !extracted.some((food) => candidateIdentity(food.name) === key)) continue;
    const creators = new Set(related.map((video) => video.channelId).filter(Boolean)).size;
    observations.set(key, { name: item.name, category: item.category, mentions: related.length || item.mentions,
      firstSeen: prior?.firstSeen ?? date, lastSeen: related.length || extracted.some((food) => candidateIdentity(food.name) === key) ? date : prior!.lastSeen,
      days: [...new Set([...(prior?.days ?? []), ...(related.length ? [date] : [])])], creators, stage: creators >= 2 ? "여러 제작자 확인" : "새로 포착",
      history: [...(prior?.history ?? []).filter((item) => item.date !== date), { date, creators, videos: related.length }],
      ...(selected.some((food) => candidateIdentity(food.name) === key) ? { lastChecked: date } : prior?.lastChecked ? { lastChecked: prior.lastChecked } : {}),
    });
  }
  const channelMap = new Map(state.channels.map((item) => [item.id, item]));
  for (const video of merged) if (video.channelId && /^UC[a-zA-Z0-9_-]{22}$/.test(video.channelId) && candidates.some((item) => matchingVideos(item.name, [video]).length)) channelMap.set(video.channelId, { id: video.channelId, seenAt: date });
  const next = readDiscovery({ ...state, observations: [...observations.values()], channels: [...channelMap.values()].sort((a, b) => a.seenAt.localeCompare(b.seenAt)) }, date);
  return { state: next, videos: merged, candidates, selected: selected.map((item) => item.name), searchCalls: selected.length * 2 };
}

/** 사진 대기로 공개 JSON에서 빠져도 다음 실행에서 원고 재생성 없이 다시 시도한다. */
export function retainPending(state: DiscoveryState, current: ContentSnapshot, published: ContentSnapshot, date: string): DiscoveryState {
  const publicNames = new Set(published.foods.map((food) => candidateIdentity(food.name)));
  const pending = new Map(state.pending.filter(({ food }) => !publicNames.has(candidateIdentity(food.name))).map((item) => [candidateIdentity(item.food.name), item]));
  for (const food of current.foods) if (!publicNames.has(candidateIdentity(food.name))) {
    const prior = pending.get(candidateIdentity(food.name));
    pending.set(candidateIdentity(food.name), { food, savedAt: prior?.savedAt ?? date });
  }
  return readDiscovery({ ...state, pending: [...pending.values()] }, date);
}

export function restorePending(current: ContentSnapshot, state: DiscoveryState): ContentSnapshot {
  const names = new Set(current.foods.map((food) => candidateIdentity(food.name)));
  const slugs = new Set(current.foods.map((food) => food.slug));
  return { ...current, foods: [...current.foods, ...state.pending.map(({ food }) => food).filter((food) => !names.has(candidateIdentity(food.name)) && !slugs.has(food.slug))] };
}

/** 보관 원고도 출처를 다시 조회해 최근의 다른 제작자 2명을 확인한 뒤 사진 검색에 넣는다. */
export async function readyPending(state: DiscoveryState, date: string, descriptions: (ids: string[]) => Promise<RecipeVideo[]>): Promise<DiscoveryState> {
  const ids = state.pending.flatMap(({ food }) => food.sources.flatMap(({ url }) => {
    const source = new URL(url);
    const id = source.hostname === "www.youtube.com" && source.pathname === "/watch" ? source.searchParams.get("v") : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? [id] : [];
  }));
  if (!ids.length) return { ...state, pending: [] };
  const details = await descriptions([...new Set(ids)]);
  return { ...state, pending: state.pending.filter(({ food }) => {
    const related = matchingVideos(food.name, details).filter((video) => {
      const age = Date.parse(`${date}T23:59:59Z`) - Date.parse(video.publishedAt ?? "");
      return food.sources.some((source) => source.url === `https://www.youtube.com/watch?v=${video.id}`) && video.channelId && age >= 0 && age <= 8 * 86_400_000;
    });
    if (new Set(related.map((video) => video.channelId)).size < 2) return false;
    if (food.kind !== "discovery") return true;
    const excerpt = food.summary.match(/^원문 소개: “([\s\S]*)”$/)?.[1];
    return !!excerpt && related.some((video) => video.title.includes(excerpt) || video.description.includes(excerpt));
  }) };
}
