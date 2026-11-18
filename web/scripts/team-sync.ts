import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 훅에서 실행한 단위 테스트의 임시 저장소에도 현재 저장소 설정이 새지 않게 한다.
export function gitEnvironment() {
  const env = { ...process.env };
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_PREFIX"]) delete env[name];
  return env;
}

export function git(root: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd: root, env: gitEnvironment(), encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args[0]} 실패: ${result.stderr || result.error?.message || "Git을 확인해 주세요."}`);
  return result.stdout.trim();
}

export function installTeamHook(root: string, env: Record<string, string | undefined> = process.env) {
  if (env.CI || env.GITHUB_ACTIONS) return "CI에서는 로컬 훅을 설치하지 않습니다.";
  const configured = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, env: gitEnvironment(), encoding: "utf8" });
  if (configured.status !== 0 && configured.status !== 1) throw new Error("Git 훅 설정을 읽지 못했습니다.");
  const hooksPath = configured.stdout.trim();
  if (hooksPath && hooksPath !== ".githooks") throw new Error(`기존 core.hooksPath(${hooksPath})를 보존했습니다. docs/team-workflow.md를 확인해 주세요.`);
  const previous = resolve(root, git(root, "rev-parse", "--git-path", "hooks/pre-push"));
  if (!hooksPath && existsSync(previous)) throw new Error("기존 pre-push 훅을 보존했습니다. docs/team-workflow.md를 확인해 주세요.");
  const hook = resolve(root, ".githooks/pre-push");
  if (!existsSync(hook)) throw new Error(".githooks/pre-push가 없습니다. 저장소 전체를 받아 주세요.");
  chmodSync(hook, 0o755);
  git(root, "config", "--local", "core.hooksPath", ".githooks");
  return "팀 공통 pre-push 훅을 활성화했습니다. main 푸시 전에 원격 변경과 검사를 확인합니다.";
}

function runProjectCheck(root: string, script: string) {
  console.log(`[팀 동기화] npm run ${script}`);
  // 명령과 스크립트 이름은 아래의 고정 목록만 사용한다.
  const result = spawnSync(`npm run ${script}`, {
    cwd: resolve(root, "web"), env: gitEnvironment(), stdio: "inherit", shell: true,
  });
  if (result.status !== 0) throw new Error(`npm run ${script} 실패. 수정 후 다시 푸시해 주세요.`);
}

const integrateMessage = "팀원 변경이 있습니다. git log HEAD..origin/main과 diff·작업 기록을 읽고, 깨끗한 상태에서 git pull --rebase origin main 후 통합·검사해 주세요. AGENTS.md의 팀원 변경 통합 절차를 따르세요.";

export function checkTeamPush(root: string, remote: string, input: string, runCheck = runProjectCheck) {
  const updates = input.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(/\s+/));
  const main = updates.find((update) => update[2] === "refs/heads/main");
  if (!main) return;
  if (remote !== "origin") throw new Error("main 푸시는 origin을 사용해 주세요: git push origin HEAD:main");
  const localSha = main[1];
  if (!localSha || /^0+$/.test(localSha)) throw new Error("main 삭제는 허용하지 않습니다.");
  const head = git(root, "rev-parse", "HEAD");
  if (localSha !== head) throw new Error("검사할 현재 HEAD만 main으로 푸시할 수 있습니다.");
  if (git(root, "status", "--porcelain")) throw new Error("미커밋 변경이 있습니다. 내 작업만 커밋한 뒤 다시 푸시해 주세요. 남의 변경은 보존하세요.");

  git(root, "fetch", "origin", "+refs/heads/main:refs/remotes/origin/main");
  const baseline = git(root, "rev-parse", "origin/main");
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", baseline, head], { cwd: root, env: gitEnvironment() });
  if (ancestor.status !== 0) throw new Error(integrateMessage);
  git(root, "diff", "--check", baseline, head);
  const files = git(root, "diff", "--name-only", "-z", baseline, head).split("\0").filter(Boolean);
  const documentsOnly = files.every((file) => /\.md$/i.test(file));
  if (!documentsOnly) {
    for (const script of ["lint", "typecheck", "test:unit", "test:e2e"]) runCheck(root, script);
    if (files.some((file) => /^(web\/(src\/(app|components|data\/content|assets|lib)|public|e2e)\/|web\/playwright\.content\.config)/.test(file))) runCheck(root, "test:content");
  }
  if (git(root, "rev-parse", "HEAD") !== head || git(root, "status", "--porcelain")) throw new Error("검사 중 로컬 파일·커밋이 바뀌었습니다. 변경을 확인하고 다시 푸시해 주세요.");
  git(root, "fetch", "origin", "+refs/heads/main:refs/remotes/origin/main");
  if (git(root, "rev-parse", "origin/main") !== baseline) throw new Error(`검사 중 원격 main이 바뀌었습니다. ${integrateMessage}`);
  console.log(`[팀 동기화] origin/main ${baseline.slice(0, 12)} 확인, ${documentsOnly ? "문서 diff 검사" : "프로젝트 검사"} 통과.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = git(process.cwd(), "rev-parse", "--show-toplevel");
    if (process.argv[2] === "install") console.log(installTeamHook(root));
    else if (process.argv[2] === "pre-push") checkTeamPush(root, process.argv[3], readFileSync(0, "utf8"));
    else throw new Error("사용법: team-sync.ts install | pre-push <remote>");
  } catch (error) {
    console.error(`[팀 동기화] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
