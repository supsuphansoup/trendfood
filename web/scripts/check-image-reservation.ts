import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** 캐시 저장은 실패해도 경고만 낼 수 있어, 서버에서 저장 여부를 확인한다. 실패하면 생성을 허용하지 않는다. */
export async function imageReservationSaved(repo: string, key: string, token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^food-image-generation-day-v1-\d{4}-\d{2}-\d{2}$/.test(key) || !token) return false;
  try {
    const response = await fetcher(`https://api.github.com/repos/${repo}/actions/caches?key=${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      redirect: "error", signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return false;
    const body = await response.json() as { actions_caches?: { key: string; ref: string }[] };
    return Array.isArray(body.actions_caches) && body.actions_caches.some((cache) => cache.key === key && cache.ref === "refs/heads/main");
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const allowed = await imageReservationSaved(process.env.GITHUB_REPOSITORY ?? "", process.env.IMAGE_RESERVATION_KEY ?? "", process.env.GITHUB_TOKEN ?? "");
  await appendFile(process.env.GITHUB_OUTPUT!, `allowed=${allowed}\n`);
  console.log(allowed ? "일일 이미지 생성 예약 확인: 최대 1회 허용" : "예약 저장을 확인하지 못해 유료 생성을 건너뛰어요");
}
