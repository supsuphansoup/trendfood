import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { imageDate } from "./generated-photo-automation.ts";
import { DAILY_IMAGE_REQUEST_LIMIT } from "./pipeline/publish-policy.ts";

type CacheList = { actions_caches?: { id: number; key: string; ref: string }[] };
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" });
const validReservation = (repo: string, key: string, token: string) => /^[\w.-]+\/[\w.-]+$/.test(repo) && /^food-image-generation-day-v1-\d{4}-\d{2}-\d{2}$/.test(key) && !!token;

/** 캐시 저장은 실패해도 경고만 낼 수 있어, 서버에서 저장 여부를 확인한다. 실패하면 생성을 허용하지 않는다. */
export async function imageReservationSaved(repo: string, key: string, token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!validReservation(repo, key, token)) return false;
  try {
    const response = await fetcher(`https://api.github.com/repos/${repo}/actions/caches?key=${encodeURIComponent(key)}`, {
      headers: headers(token),
      redirect: "error", signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return false;
    const body = await response.json() as CacheList;
    return Array.isArray(body.actions_caches) && body.actions_caches.some((cache) => cache.key === key && cache.ref === "refs/heads/main");
  } catch { return false; }
}

/** 현재 실행이 새로 확보한 예약에만 사용한다. 0회 보고가 없거나 실패했으면 예약을 보존한다. */
export async function releaseUnusedImageReservation(repo: string, key: string, token: string, report: unknown, now: Date, fetcher: typeof fetch = fetch): Promise<boolean> {
  const value = report as { checkedAt?: string; generated?: unknown[]; imageGeneration?: { enabled?: boolean; attempts?: unknown[] } } | null;
  if (!validReservation(repo, key, token) || key !== `food-image-generation-day-v1-${imageDate(now)}` || !value?.checkedAt || !Number.isFinite(Date.parse(value.checkedAt)) || imageDate(new Date(value.checkedAt)) !== imageDate(now) || value.imageGeneration?.enabled !== true || !Array.isArray(value.imageGeneration.attempts) || value.imageGeneration.attempts.length !== 0 || !Array.isArray(value.generated) || value.generated.length !== 0) return false;
  try {
    const response = await fetcher(`https://api.github.com/repos/${repo}/actions/caches?key=${encodeURIComponent(key)}`, { headers: headers(token), redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return false;
    const body = await response.json() as CacheList;
    const caches = body.actions_caches?.filter((cache) => cache.key === key && cache.ref === "refs/heads/main");
    if (!caches || caches.length !== 1 || !Number.isSafeInteger(caches[0].id) || caches[0].id <= 0) return false;
    const removed = await fetcher(`https://api.github.com/repos/${repo}/actions/caches/${caches[0].id}`, { method: "DELETE", headers: headers(token), redirect: "error", signal: AbortSignal.timeout(30_000) });
    return removed.status === 204;
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--release-unused")) {
    const report: unknown = await readFile("data/photo-report.json", "utf8").then((text) => JSON.parse(text) as unknown).catch(() => undefined);
    const released = await releaseUnusedImageReservation(process.env.GITHUB_REPOSITORY ?? "", process.env.IMAGE_RESERVATION_KEY ?? "", process.env.GITHUB_TOKEN ?? "", report, new Date());
    console.log(released ? "이미지 생성 API 시도 0회 확인: 미사용 예약 반환" : "미사용 여부·반환을 확인하지 못해 일일 예약을 보존해요");
  } else {
    const allowed = await imageReservationSaved(process.env.GITHUB_REPOSITORY ?? "", process.env.IMAGE_RESERVATION_KEY ?? "", process.env.GITHUB_TOKEN ?? "");
    await appendFile(process.env.GITHUB_OUTPUT!, `allowed=${allowed}\n`);
    console.log(allowed ? `일일 이미지 생성 예약 확인: 최대 ${DAILY_IMAGE_REQUEST_LIMIT}회 허용` : "예약 저장을 확인하지 못해 유료 생성을 건너뛰어요");
  }
}
