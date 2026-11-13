import type { PhotoCredit, PhotoProvider } from "../src/data/photo-credits.ts";
import { validPhotoSource } from "../src/data/photo-source.ts";
import { searchPhotos, type PhotoCandidate } from "./photo-automation.ts";

type OpenverseImage = { id: string; title: string; creator: string; creator_url?: string; foreign_landing_url: string; url: string; width: number; height: number; license: string; license_version: string; license_url: string; source: string; mature: boolean; category: string; attribution?: string; tags?: { name: string }[] };
type PexelsPhoto = { id: number; width: number; height: number; url: string; photographer: string; photographer_url: string; alt: string; src: { original: string } };
const clean = (text: unknown) => (typeof text === "string" ? text : "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const sized = (width: number, height: number) => Number.isFinite(width) && Number.isFinite(height) && Math.min(width, height) >= 480 && Math.max(width, height) / Math.min(width, height) <= 3;
const synthetic = (text: string) => /\b(?:AI-generated|AI generated|synthetic media|generative AI)\b/i.test(text);

export function openversePhoto(item: OpenverseImage, checkedAt: string): PhotoCandidate | null {
  if (!item || item.source !== "flickr" || item.mature !== false || item.category !== "photograph" || !sized(item.width, item.height) || !clean(item.title) || !clean(item.creator)) return null;
  const license: PhotoCredit["license"] | undefined = item.license === "cc0" && item.license_version === "1.0" ? "CC0"
    : item.license === "pdm" && item.license_version === "1.0" ? "Public domain"
    : item.license === "by" && item.license_version === "4.0" ? "CC BY 4.0"
    : item.license === "by-sa" && item.license_version === "4.0" ? "CC BY-SA 4.0" : undefined;
  if (!license) return null;
  const description = (Array.isArray(item.tags) ? item.tags : []).map((tag) => clean(tag?.name)).join(" · ").slice(0, 1800);
  if (synthetic(`${item.title} ${description}`)) return null;
  const photo: PhotoCandidate = {
    provider: "openverse", providerId: item.id, title: clean(item.title), author: clean(item.creator), creatorUrl: item.creator_url,
    url: item.foreign_landing_url, imageUrl: item.url, license, licenseUrl: item.license_url,
    attributionNotice: clean(item.attribution ?? "").slice(0, 2000), verifiedAt: checkedAt, automatic: true, description, note: "",
  };
  return validPhotoSource(photo) ? photo : null;
}

export function pexelsPhoto(item: PexelsPhoto, checkedAt: string): PhotoCandidate | null {
  if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || !sized(item.width, item.height) || !clean(item.alt) || !clean(item.photographer) || synthetic(clean(item.alt))) return null;
  const photo: PhotoCandidate = {
    provider: "pexels", providerId: String(item.id), title: clean(item.alt), author: clean(item.photographer), creatorUrl: item.photographer_url,
    url: item.url, imageUrl: item.src?.original, license: "Pexels License", licenseUrl: "https://www.pexels.com/license/",
    verifiedAt: checkedAt, automatic: true, description: clean(item.alt), note: "",
  };
  return validPhotoSource(photo) ? photo : null;
}

async function searchOpenverse(query: string, checkedAt: string, fetcher: typeof fetch): Promise<PhotoCandidate[]> {
  const parameters = new URLSearchParams({ q: query, page_size: "12", source: "flickr", license: "cc0,pdm,by,by-sa", category: "photograph", mature: "false" });
  const response = await fetcher(`https://api.openverse.org/v1/images/?${parameters}`, { headers: { "User-Agent": "TrendfoodPhotoBot/1.0 (https://github.com/supsuphansoup/trendfood)", Accept: "application/json" }, signal: AbortSignal.timeout(30_000), redirect: "error" });
  if (!response.ok) throw new Error(`Openverse 검색 실패: ${response.status}`);
  const body = await response.json() as { results: OpenverseImage[] };
  if (!Array.isArray(body.results)) throw new Error("Openverse 응답 형식 오류");
  return body.results.map((item) => openversePhoto(item, checkedAt)).filter((photo): photo is PhotoCandidate => !!photo);
}

async function searchPexels(query: string, checkedAt: string, fetcher: typeof fetch, key: string): Promise<PhotoCandidate[]> {
  const parameters = new URLSearchParams({ query, per_page: "12", locale: "ko-KR" });
  const response = await fetcher(`https://api.pexels.com/v1/search?${parameters}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(30_000), redirect: "error" });
  if (!response.ok) throw new Error(`Pexels 검색 실패: ${response.status}`);
  const body = await response.json() as { photos: PexelsPhoto[] };
  if (!Array.isArray(body.photos)) throw new Error("Pexels 응답 형식 오류");
  return body.photos.map((item) => pexelsPhoto(item, checkedAt)).filter((photo): photo is PhotoCandidate => !!photo);
}

type SearchOptions = { fetcher?: typeof fetch; pexelsKey?: string; onWarning?: (provider: PhotoProvider) => void };

/** 한 출처의 장애가 다른 출처를 막지 않으며, 후보는 출처별로 번갈아 반환한다. */
export async function searchPhotoSources(query: string, checkedAt: string, options: SearchOptions = {}): Promise<PhotoCandidate[]> {
  const fetcher = options.fetcher ?? fetch;
  const key = options.pexelsKey ?? process.env.PEXELS_API_KEY ?? "";
  const searches: { provider: PhotoProvider; run: () => Promise<PhotoCandidate[]> }[] = [
    { provider: "commons", run: () => searchPhotos(query, checkedAt, fetcher) },
    { provider: "openverse", run: () => searchOpenverse(query, checkedAt, fetcher) },
    ...(key.trim() ? [{ provider: "pexels" as const, run: () => searchPexels(query, checkedAt, fetcher, key.trim()) }] : []),
  ];
  const results = await Promise.allSettled(searches.map((source) => source.run()));
  const batches: PhotoCandidate[][] = [];
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") batches.push(result.value);
    else options.onWarning?.(searches[index].provider);
  }
  if (!batches.length) throw new Error("모든 사진 검색처에 연결하지 못했어요");
  const photos = new Map<string, PhotoCandidate>();
  for (let index = 0; index < Math.max(0, ...batches.map((batch) => batch.length)); index++) {
    for (const batch of batches) if (batch[index]) photos.set(batch[index].url, batch[index]);
  }
  return [...photos.values()];
}
