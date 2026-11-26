import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "../src/data/content";
import type { ContentEditState } from "../src/data/content-edits";
import { adminApi, publishedFixture, publishedPhotoId } from "./admin-api";

const original = JSON.parse(readFileSync(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const account = { id: "11111111-1111-1111-1111-111111111111", email: "admin@trendfood.test" };
const json = (route: Route, data: unknown, status = 200) =>
  route.fulfill({ status, json: data, headers: { "access-control-allow-origin": "*" } });

test("공개 데이터가 상세·사이트맵에 반영되고 비공개 음식 주소가 내려간다", async ({ page, request }) => {
  await page.goto("/food/egg-soup");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("운영자 수정 계란국");
  await expect(page.getByRole("img", { name: "관리자 업로드 계란국 사진" })).toHaveAttribute("src", `/photos/${publishedPhotoId}.webp`);
  expect((await request.get(`/photos/${publishedPhotoId}.webp`)).ok()).toBe(true);
  expect((await request.get("/food/mint-choco-latte")).status()).toBe(404);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/food/egg-soup");
  expect(sitemap).not.toContain("/food/mint-choco-latte");
});

test("관리자가 공개 음식 전체를 찾아 편집·숨김·복구하고 저장한 버전을 배포 요청한다", async ({ page }, info) => {
  const state: ContentEditState = { revision: 0, draft: structuredClone(publishedFixture), published: structuredClone(publishedFixture) };
  let dispatches = 0;
  let authReads = 0;
  let rejectDispatch = true;
  const takeDown: { id: number; action: string; reason: string; memo: string; created_at: string }[] = [];
  await page.route("https://raw.githubusercontent.com/supsuphansoup/trendfood/**", (route) => {
    authReads++;
    return json(route, original);
  });
  await page.route(`${adminApi}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({
      status: 204,
      headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" },
    });
    if (url.pathname === "/auth/v1/token") {
      const base64 = (input: unknown) => Buffer.from(JSON.stringify(input)).toString("base64url");
      const exp = Math.floor(Date.now() / 1000) + 3600;
      return json(route, {
        access_token: `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: account.id, role: "authenticated", exp })}.sig`,
        token_type: "bearer", refresh_token: "refresh", expires_in: 3600, expires_at: exp, user: account,
      });
    }
    if (url.pathname === "/rest/v1/admins") return json(route, [{ user_id: account.id }]);
    if (url.pathname === "/rest/v1/content_edits") {
      if (request.method() === "GET") return json(route, state);
      if (url.searchParams.get("revision") !== `eq.${state.revision}`) return json(route, []);
      const patch = request.postDataJSON() as Partial<ContentEditState>;
      if (patch.draft?.foods["mint-choco-latte"]?.hidden !== undefined &&
        patch.draft.foods["mint-choco-latte"].hidden !== state.draft.foods["mint-choco-latte"].hidden) {
        takeDown.unshift({ id: takeDown.length + 1, action: patch.draft.foods["mint-choco-latte"].hidden ? "hide" : "show",
          reason: "", memo: "", created_at: "2026-11-26T08:00:00Z" });
      }
      Object.assign(state, patch);
      return json(route, [state]);
    }
    if (url.pathname === "/rest/v1/content_takedown_log") return json(route, takeDown);
    if (url.pathname === "/rest/v1/photos") return json(route, [{ id: publishedPhotoId }]);
    if (url.pathname === "/functions/v1/request-publish") {
      if (rejectDispatch) return json(route, { message: "시험 배포 오류" }, 502);
      dispatches++;
      return json(route, { message: "반영을 요청했어요. 3~5분 뒤 사이트에 보여요." });
    }
    if (url.pathname === "/rest/v1/pipeline_runs") return json(route, []);
    return json(route, { message: "예상하지 못한 요청" }, 404);
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
  expect(authReads).toBe(0);
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호").fill("test-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText(`게시 중 ${original.foods.length - 1}개 · 전체 ${original.foods.length}개.`, { exact: false })).toBeVisible();
  expect(authReads).toBe(1);

  const search = page.getByRole("searchbox", { name: "음식 검색" });
  await search.fill("계란국");
  await page.getByRole("button", { name: "기본 정보 고치기" }).click();
  await page.getByLabel("이름 (30자)").fill("관리자가 고친 계란국");
  state.revision++;
  await page.getByRole("button", { name: "기본 정보 저장" }).click();
  await expect(page.getByText("다른 관리자가 먼저 저장했어요.", { exact: false })).toBeVisible();
  expect(state.draft.foods["egg-soup"].name).toBe("운영자 수정 계란국");
  await expect(page.getByLabel("이름 (30자)")).toHaveValue("관리자가 고친 계란국");
  await page.getByRole("button", { name: "기본 정보 저장" }).click();
  await expect(page.getByRole("heading", { name: "관리자가 고친 계란국" })).toBeVisible();
  await expect(page.getByText("사이트에 반영할 변경이 있어요.")).toBeVisible();
  expect(state.published.foods["egg-soup"].name).toBe("운영자 수정 계란국");
  expect(state.draft.foods["egg-soup"]).toEqual({ ...publishedFixture.foods["egg-soup"], name: "관리자가 고친 계란국" });

  await search.fill("mint-choco-latte");
  const hidden = page.getByRole("switch", { name: "숨기기" });
  await expect(hidden).toBeChecked();
  await hidden.click();
  await expect(hidden).not.toBeChecked();
  await hidden.click();
  await expect(hidden).toBeChecked();
  await expect(page.getByText("내림 기록", { exact: true })).toBeVisible();
  await expect(page.getByText("· 숨김 · 사유 없음", { exact: false })).toBeVisible();
  await hidden.click();
  await expect(hidden).not.toBeChecked();
  expect(dispatches).toBe(0);

  expect((await new AxeBuilder({ page }).analyze()).violations.map((violation) => violation.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport!.width);
  await page.screenshot({ path: `test-results/content-admin/admin-content-${info.project.name}.png`, fullPage: true });
  const publish = page.getByRole("button", { name: "사이트에 반영" });
  await publish.click();
  await expect(page.getByText("변경은 저장됐지만 배포를 요청하지 못했어요. 시험 배포 오류")).toBeVisible();
  expect(state.published).toEqual(state.draft);
  rejectDispatch = false;
  await publish.click();
  await expect(page.getByText("반영을 요청했어요. 3~5분 뒤 사이트에 보여요.")).toBeVisible();
  expect(dispatches).toBe(1);
  expect(state.published.foods["mint-choco-latte"].hidden).toBe(false);
});
