import test from "node:test";
import assert from "node:assert/strict";
import { reportAutomation } from "./automation-alert.ts";

const env = { GITHUB_TOKEN: "test-token", GITHUB_REPOSITORY: "test/repo", GITHUB_RUN_ID: "123", PIPELINE_RESULT: "failure" };
test("자동화 실패는 새 이슈 또는 기존 알림 하나를 갱신하고 성공 시 닫는다", async () => {
  for (const existing of [false, true]) for (const result of ["success", "failure"]) {
    const calls: { url: string; method: string; body: string }[] = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? "GET", body: String(init?.body ?? "") });
      return Response.json(calls.length === 1 ? existing ? [{ number: 7, title: "자동 음식 수집·배포 실패", body: "<!-- trendfood-pipeline-alert -->" }] : [] : {});
    };
    const status = await reportAutomation({ ...env, PIPELINE_RESULT: result }, fetcher as typeof fetch);
    assert.equal(status, result === "failure" ? existing ? "updated" : "created" : existing ? "resolved" : "healthy");
    assert.equal(calls.length, result === "failure" || existing ? 2 : 1);
    assert.ok(calls.every((call) => !call.body.includes("test-token")));
    if (calls[1]) assert.equal(calls[1].method, existing ? "PATCH" : "POST");
    if (result === "success" && existing) assert.equal(JSON.parse(calls[1].body).state, "closed");
  }
});
test("잘못된 알림 설정·API 장애는 성공으로 숨기지 않는다", async () => {
  await assert.rejects(reportAutomation({ ...env, GITHUB_REPOSITORY: "../invalid" }), /설정/);
  await assert.rejects(reportAutomation(env, (async () => new Response("", { status: 403 })) as typeof fetch), /403/);
});

test("알림이 두 번째 페이지에 있어도 중복 이슈 대신 기존 알림을 갱신한다", async () => {
  const calls: string[] = [];
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    if (init?.method === "PATCH") return Response.json({});
    return Response.json(calls.length === 1 ? Array.from({ length: 100 }, (_, number) => ({ number, title: "다른 이슈" })) : [{ number: 123, title: "자동 음식 수집·배포 실패", body: "<!-- trendfood-pipeline-alert -->" }]);
  };
  assert.equal(await reportAutomation(env, fetcher as typeof fetch), "updated");
  assert.match(calls[1], /page=2/);
  assert.ok(calls[2].endsWith("/issues/123"));
});
