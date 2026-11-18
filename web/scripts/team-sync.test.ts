import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, type TestContext } from "node:test";
import { checkTeamPush, git, gitEnvironment, installTeamHook } from "./team-sync.ts";

function fixture(t: TestContext) {
  const folder = mkdtempSync(join(tmpdir(), "trendfood-팀 검사-"));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const origin = join(folder, "origin.git");
  const local = join(folder, "local");
  const teammate = join(folder, "teammate");
  git(folder, "init", "--bare", "--initial-branch=main", origin);
  git(folder, "clone", origin, local);
  for (const root of [local]) {
    git(root, "config", "user.name", "테스트");
    git(root, "config", "user.email", "test@example.invalid");
    git(root, "config", "core.autocrlf", "false");
  }
  writeFileSync(join(local, "README.md"), "초기 문서\n");
  git(local, "add", ".");
  git(local, "commit", "-m", "초기 상태");
  git(local, "push", "origin", "main");
  git(folder, "clone", origin, teammate);
  git(teammate, "config", "user.name", "팀원");
  git(teammate, "config", "user.email", "teammate@example.invalid");
  git(teammate, "config", "core.autocrlf", "false");
  return { local, teammate, origin };
}

function commit(root: string, file = "code.ts", value = "export const value = 1;\n") {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), value);
  git(root, "add", ".");
  git(root, "commit", "-m", "테스트 변경");
}

function input(root: string, ref = "refs/heads/main", sha = git(root, "rev-parse", "HEAD")) {
  return `HEAD ${sha} ${ref} ${git(root, "rev-parse", "origin/main")}\n`;
}

test("푸시 검사: 팀원 변경 누락 차단, rebase 통합 후 네 검사 실행", (t) => {
  const { local, teammate } = fixture(t);
  commit(local);
  commit(teammate, "팀원.md", "팀원 변경\n");
  git(teammate, "push", "origin", "main");
  assert.throws(() => checkTeamPush(local, "origin", input(local), () => assert.fail("검사 전 차단해야 함")), /팀원 변경/);
  git(local, "pull", "--rebase", "origin", "main");
  const checks: string[] = [];
  checkTeamPush(local, "origin", input(local), (_, script) => { checks.push(script); });
  assert.deepEqual(checks, ["lint", "typecheck", "test:unit", "test:e2e"]);
  assert.equal(readFileSync(join(local, "팀원.md"), "utf8"), "팀원 변경\n");
});

test("푸시 검사: 검사 실패와 검사 중 원격 변경 차단", (t) => {
  const { local, teammate } = fixture(t);
  commit(local);
  assert.throws(() => checkTeamPush(local, "origin", input(local), () => { throw new Error("검사 실패"); }), /검사 실패/);
  let updated = false;
  assert.throws(() => checkTeamPush(local, "origin", input(local), () => {
    if (updated) return;
    commit(teammate, "다른작업.md", "검사 중 변경\n");
    git(teammate, "push", "origin", "main");
    updated = true;
  }), /검사 중 원격 main/);
});

test("푸시 검사: 미커밋·삭제·다른 HEAD·다른 원격 차단, 일반 브랜치는 제외", (t) => {
  const { local } = fixture(t);
  commit(local);
  assert.throws(() => checkTeamPush(local, "origin", input(local, "refs/heads/main", "0".repeat(40))), /삭제/);
  assert.throws(() => checkTeamPush(local, "origin", input(local, "refs/heads/main", git(local, "rev-parse", "HEAD~1"))), /현재 HEAD/);
  assert.throws(() => checkTeamPush(local, "other", input(local)), /origin/);
  writeFileSync(join(local, "untracked.txt"), "미커밋\n");
  assert.throws(() => checkTeamPush(local, "origin", input(local)), /미커밋/);
  checkTeamPush(local, "origin", input(local, "refs/heads/feature"), () => assert.fail("브랜치 검사 제외"));
});

test("푸시 검사: 검사 중 로컬 변경 차단, 공개 경로 추가 검사", (t) => {
  const { local } = fixture(t);
  commit(local, "web/src/app/example.ts");
  const checks: string[] = [];
  checkTeamPush(local, "origin", input(local), (_, script) => { checks.push(script); });
  assert.equal(checks.at(-1), "test:content");
  assert.throws(() => checkTeamPush(local, "origin", input(local), () => {
    writeFileSync(join(local, "changed.txt"), "검사 중 변경\n");
  }), /검사 중 로컬/);
});

test("푸시 검사: 한글 문서만 변경하면 프로젝트 검사 생략", (t) => {
  const { local } = fixture(t);
  commit(local, "한글문서.md", "문서 변경\n");
  checkTeamPush(local, "origin", input(local), () => assert.fail("문서는 별도 검토"));
});

test("훅 설치: CI 제외, 기존 설정·기본 훅 보존, 반복 설치 허용", (t) => {
  const { local } = fixture(t);
  assert.match(installTeamHook(local, { CI: "true" }), /CI/);
  git(local, "config", "core.hooksPath", "existing-hooks");
  assert.throws(() => installTeamHook(local, {}), /기존 core.hooksPath/);
  assert.equal(git(local, "config", "--get", "core.hooksPath"), "existing-hooks");
  git(local, "config", "--unset", "core.hooksPath");
  const previous = join(local, ".git/hooks/pre-push");
  writeFileSync(previous, "기존 훅\n");
  assert.throws(() => installTeamHook(local, {}), /기존 pre-push/);
  assert.equal(readFileSync(previous, "utf8"), "기존 훅\n");
  rmSync(previous);
  mkdirSync(join(local, ".githooks"));
  writeFileSync(join(local, ".githooks/pre-push"), "#!/bin/sh\nexit 0\n");
  assert.match(installTeamHook(local, {}), /활성화/);
  assert.match(installTeamHook(local, {}), /활성화/);
  assert.equal(git(local, "config", "--get", "core.hooksPath"), ".githooks");
});

test("실제 npm ci·Git 훅: 자동 설치 후 검사 실패 시 원격 보존", (t) => {
  const { local, origin } = fixture(t);
  const project = fileURLToPath(new URL("../../", import.meta.url));
  mkdirSync(join(local, ".githooks"));
  mkdirSync(join(local, "web/scripts"), { recursive: true });
  copyFileSync(join(project, ".githooks/pre-push"), join(local, ".githooks/pre-push"));
  copyFileSync(join(project, "web/scripts/team-sync.ts"), join(local, "web/scripts/team-sync.ts"));
  const scripts = Object.fromEntries(["lint", "typecheck", "test:unit", "test:e2e"].map((name) => [name, "node -e \"process.exit(0)\""]));
  scripts.prepare = "node scripts/team-sync.ts install";
  const metadata = { name: "team-hook-test", version: "1.0.0" };
  writeFileSync(join(local, "web/package.json"), JSON.stringify({ ...metadata, type: "module", scripts }));
  writeFileSync(join(local, "web/package-lock.json"), JSON.stringify({ ...metadata, lockfileVersion: 3, packages: { "": metadata } }));
  writeFileSync(join(local, ".gitignore"), "node_modules/\n");
  git(local, "add", ".");
  git(local, "commit", "-m", "공통 훅 설치");
  const installed = spawnSync("npm ci --no-audit --no-fund", {
    cwd: join(local, "web"), env: { ...gitEnvironment(), CI: "", GITHUB_ACTIONS: "" }, encoding: "utf8", shell: true,
  });
  assert.equal(installed.status, 0, installed.stdout + installed.stderr);
  assert.equal(git(local, "config", "--get", "core.hooksPath"), ".githooks");
  git(local, "push", "origin", "HEAD:main");
  const accepted = git(origin, "rev-parse", "main");
  scripts.lint = "node -e \"process.exit(1)\"";
  commit(local, "web/package.json", JSON.stringify({ ...metadata, type: "module", scripts }));
  const rejected = spawnSync("git", ["push", "origin", "HEAD:main"], { cwd: local, env: gitEnvironment(), encoding: "utf8" });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /npm run lint 실패/);
  assert.equal(git(origin, "rev-parse", "main"), accepted);
});
