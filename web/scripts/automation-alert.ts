import { pathToFileURL } from "node:url";

const title = "자동 음식 수집·배포 실패";
const marker = "<!-- trendfood-pipeline-alert -->";

/** 실패마다 이슈를 늘리지 않고 같은 알림을 갱신한다. 토큰·실패 원문은 기록하지 않는다. */
export async function reportAutomation(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: run, PIPELINE_RESULT: result } = env;
  if (!token || !repository || !/^[a-z0-9][\w.-]*\/[a-z0-9][\w.-]*$/i.test(repository) || !run || !/^\d+$/.test(run) || !["success", "failure"].includes(result ?? "")) throw new Error("자동화 알림 설정을 확인해 주세요");
  const request = async (path: string, method = "GET", body?: object) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}/issues${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`자동화 알림 API 실패: ${response.status}`);
    return response.json();
  };
  type Issue = { number: number; title: string; body?: string; pull_request?: object };
  let issue: Issue | undefined;
  for (let page = 1; ; page++) {
    const issues = await request(`?state=open&per_page=100&page=${page}`) as Issue[];
    issue = issues.find((item) => !item.pull_request && item.title === title && item.body?.includes(marker));
    if (issue || issues.length < 100) break;
  }
  const url = `https://github.com/${repository}/actions/runs/${run}`;
  if (result === "failure") {
    const body = `${marker}\n음식 자동 수집 또는 배포 검사에 실패했어요. 기존 공개 사이트는 유지됩니다.\n\n[실패한 실행 확인](${url})\n\n수정 후 전체 검사와 다음 수집 결과를 확인해 주세요.`;
    await request(issue ? `/${issue.number}` : "", issue ? "PATCH" : "POST", { title, body });
    return issue ? "updated" : "created";
  }
  if (issue) {
    await request(`/${issue.number}`, "PATCH", { state: "closed", body: `${marker}\n[수집·배포 정상 완료 확인](${url})` });
    return "resolved";
  }
  return "healthy";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`자동화 알림: ${await reportAutomation(process.env)}`);
}
