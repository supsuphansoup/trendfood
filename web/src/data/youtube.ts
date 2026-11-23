import type { FoodRecord } from "./catalog-schema.ts";

const validId = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (validId.test(value)) return value;
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.host)) return null;
    const id = url.host === "youtu.be"
      ? url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1]
      : url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    return id && validId.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function foodVideoId(food: Pick<FoodRecord, "videoId" | "editorial">): string | null {
  if (food.videoId && validId.test(food.videoId)) return food.videoId;
  for (const source of food.editorial?.sources ?? []) {
    const id = parseYouTubeId(source.url);
    if (id) return id;
  }
  return null;
}
