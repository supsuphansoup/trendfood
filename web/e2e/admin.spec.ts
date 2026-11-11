import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route, test } from "@playwright/test";

// 관리자 화면은 브라우저에서 Supabase 와 직접 통신한다. 테스트에서는 그 통신을 가로채 가짜 Supabase 로 답한다.
// (실제 권한 검사는 DB 의 RLS 가 맡고, 그 부분은 supabase/migrations 를 PGlite 로 따로 검사했다)
const SUPABASE = "http://127.0.0.1:54321"; // playwright.config.ts 의 FAKE_SUPABASE
const ADMIN = { id: "11111111-1111-1111-1111-111111111111", email: "admin@trendfood.test", password: "correct-horse" };
const STRANGER = { id: "22222222-2222-2222-2222-222222222222", email: "guest@trendfood.test", password: "guest-pass" };

type Food = { video_id?: string | null; slug: string; name: string; category: string; tags: string[]; cook_minutes: number; cook_label: string; difficulty: string; servings: string; change_label: string; status: string; hidden: boolean; sort_order: number; why: string; summary: string; tip: string; ai_drafted: boolean; image: string; alt: string; hero_image: string | null; hero_alt: string | null; steps: { text: string; timerMinutes?: number }[]; convenience: { place: string; desc: string }[] };
type Takedown = { id: number; food_slug: string; action: "hide" | "show"; reason: string; memo: string; created_at: string };

function makeFake() {
  const foods: Food[] = [
    ["dubai-chocolate", "두바이 초콜릿"],
    ["chicken-mayo-deopbap", "치킨마요 덮밥"],
    ["shrimp-rose-tteokbokki", "새우 로제 떡볶이"],
  ].map(([slug, name], i) => ({ video_id: null, slug, name, category: "디저트", tags: ["디저트", "예전 태그"], cook_minutes: 10, cook_label: "조리 10분", difficulty: "쉬움", servings: "2인분", change_label: "새로 들어왔어요", status: "published", hidden: false, sort_order: (i + 1) * 10, why: `${name} 설명`, summary: "요약", tip: "팁", ai_drafted: false, image: "dubai", alt: "초콜릿 사진", hero_image: "dubai2", hero_alt: "히어로 사진", steps: [{ text: "섞어요" }, { text: "식혀요", timerMinutes: 10 }], convenience: [{ place: "편의점", desc: "초콜릿 바" }, { place: "마트", desc: "쿠키" }] }));
  const ingredients = [
    { id: 1, food_slug: "dubai-chocolate", position: 0, name: "카다이프", price: 12900, url: null as string | null, hard: true, pantry: false },
    { id: 2, food_slug: "dubai-chocolate", position: 1, name: "피스타치오 스프레드", price: null as number | null, url: null as string | null, hard: false, pantry: false },
  ];
  const candidates: Record<string, unknown>[] = [
    {
      id: "c1", name: "버터떡", normalized: "버터떡", category: "간식", note: "영상 3개 언급", source: "", origin: "pipeline", status: "대기", score: 4.2,
      signals: { multiplier: 4.2, trend: [10, 20, 100], videos: 3 }, created_at: "2026-11-05T00:00:00Z", week: "2026-11-02",
      draft: { slug: "butter-tteok", why: "쫀득한 버터떡", summary: "검색량이 4.2배", ingredients: [{ name: "찹쌀가루" }], steps: [{ text: "섞는다" }], tip: "" },
    },
  ];
  const published: number[] = [];
  return { foods, ingredients, candidates, published, takedownLog: [] as Takedown[], failTakedown: false, failIngredientName: "", writes: [] as string[] };
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (sub: string) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

/** URL 쿼리의 PostgREST 필터 (slug=eq.x) 하나를 읽는다 */
const eqFilter = (url: URL) => {
  for (const [k, v] of url.searchParams) if (v.startsWith("eq.")) return [k, decodeURIComponent(v.slice(3))] as const;
  return null;
};

async function installFake(page: Page) {
  const db = makeFake();
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    }
    const path = url.pathname;

    if (path === "/auth/v1/token") {
      const { email, password } = req.postDataJSON();
      const user = [ADMIN, STRANGER].find((u) => u.email === email && u.password === password);
      if (!user) return json(route, { error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
      return json(route, {
        access_token: token(user.id), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "refresh", user: { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" },
      });
    }
    if (path === "/auth/v1/logout") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    if (path === "/functions/v1/request-publish") {
      db.published.push(Date.now());
      return json(route, { message: "반영을 요청했어요. 3~5분 뒤 사이트에 보여요." });
    }

    const table = path.replace("/rest/v1/", "");
    if (table === "takedown_log" && db.failTakedown) return json(route, { message: "table takedown_log does not exist" }, 404);
    const f = eqFilter(url);
    const matches = (r: Record<string, unknown>) => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(r[key]) === value.slice(3));
    if (table === "admins") return json(route, f?.[1] === ADMIN.id ? [{ user_id: ADMIN.id }] : []);
    if (table === "pipeline_runs") return json(route, [{ started_at: "2026-11-04T21:00:00Z", finished_at: "2026-11-04T21:02:00Z", ok: true, summary: { inserted: 1 } }]);

    const rows: Record<string, unknown>[] =
      table === "foods" ? db.foods : table === "ingredients" ? db.ingredients : table === "candidates" ? db.candidates : table === "takedown_log" ? db.takedownLog : [];
    if (method === "GET") {
      const list = rows.filter(matches);
      if (table === "foods") list.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      if (table === "ingredients") list.sort((a, b) => Number(a.position) - Number(b.position));
      if (table === "takedown_log") {
        if (url.searchParams.get("order") !== "created_at.desc,id.desc") return json(route, { message: "내림 기록 정렬 누락" }, 400);
        list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || Number(b.id) - Number(a.id));
        return json(route, list.slice(0, Number(url.searchParams.get("limit") ?? list.length)));
      }
      return json(route, list);
    }
    if (method === "PATCH") {
      const patch = req.postDataJSON();
      if (table === "ingredients" && patch.name === db.failIngredientName) return json(route, { message: "재료 저장 시험 오류" }, 500);
      if (table === "ingredients" && patch.name && rows.some((r) => matches(r) && rows.some((other) => other.id !== r.id && other.food_slug === r.food_slug && other.name === patch.name))) {
        return json(route, { code: "23505", message: "duplicate key" }, 409);
      }
      if (table === "ingredients" && patch.url && !/^https:\/\/([a-z0-9-]+\.)*(coupang\.com|coupa\.ng)(\/|$)/.test(patch.url)) {
        return json(route, { code: "23514", message: "check constraint" }, 400);
      }
      db.writes.push(`${method} ${table}`);
      for (const r of rows) if (matches(r)) Object.assign(r, patch);
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    }
    if (method === "DELETE") {
      db.writes.push(`${method} ${table}`);
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i])) rows.splice(i, 1);
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    }
    if (method === "POST") {
      const body = req.postDataJSON();
      if (table === "takedown_log") {
        db.writes.push(`${method} ${table}`);
        db.takedownLog.push({ id: db.takedownLog.length + 1, reason: "", memo: "", created_at: "2026-11-11T00:00:00Z", ...body });
        return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" } });
      }
      for (const item of Array.isArray(body) ? body : [body]) {
        if (table === "ingredients" && rows.some((r) => r.food_slug === item.food_slug && r.name === item.name)) return json(route, { code: "23505", message: "duplicate key" }, 409);
        if (table === "candidates" && db.candidates.some((c) => c.normalized === item.normalized)) {
          return json(route, { code: "23505", message: "duplicate key" }, 409);
        }
        db.writes.push(`${method} ${table}`);
        rows.push({ id: table === "ingredients" ? Math.max(0, ...db.ingredients.map((i) => i.id)) + 1 : `n${rows.length + 1}`, price: null, url: null, hard: false, pantry: false, status: table === "candidates" ? "대기" : undefined, signals: {}, created_at: new Date().toISOString(), ...item });
      }
      return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" } });
    }
    return json(route, { message: `테스트 가짜 Supabase 에 없는 요청: ${method} ${path}` }, 500);
  });
  return db;
}

async function noA11y(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
}

async function login(page: Page, user = ADMIN) {
  await page.goto("/admin");
  await page.getByLabel("이메일").fill(user.email);
  await page.getByLabel("비밀번호").fill(user.password);
  await page.getByRole("button", { name: "로그인" }).click();
}

async function openDetails(page: Page) {
  await login(page);
  const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "두바이 초콜릿", exact: true }) });
  await row.getByRole("button", { name: "사진·재료·조리법 고치기" }).click();
  await expect(row.getByRole("textbox", { name: "재료 이름", exact: true })).toHaveCount(2);
  return row;
}

async function openBasicInfo(page: Page) {
  await login(page);
  const row = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "두바이 초콜릿 위로", exact: true }) });
  await row.getByRole("button", { name: "기본 정보 고치기", exact: true }).click();
  return row;
}

const cookLabel = '조리 시간 표시 문구 (비우면 "조리 N분", 40자)';
const changeLabel = "순위 변동 문구 (예: 새로 들어왔어요, 30자)";

test("내림 기록: 숨김·사유와 메모 저장·다시 보임, 접근성·44px·가로 넘침", async ({ page }, info) => {
  const db = await installFake(page);
  await login(page);
  const row = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "두바이 초콜릿 위로", exact: true }) });
  const section = row.getByRole("group", { name: "내림 기록", exact: true });
  await expect(section).toHaveCount(0);
  const insert = page.waitForRequest((req) => req.url().includes("/rest/v1/takedown_log") && req.method() === "POST");
  await row.getByRole("switch").click();
  expect((await insert).postDataJSON()).toEqual({ food_slug: "dubai-chocolate", action: "hide" });
  await expect(section.getByRole("listitem")).toContainText("2026. 11. 11. 오전 09:00 · 숨김 · 사유 없음");
  expect(db.foods[0].hidden).toBe(true);
  expect(db.takedownLog).toHaveLength(1);
  expect(db.writes.slice(0, 2)).toEqual(["PATCH foods", "POST takedown_log"]);
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿을(를) 숨겼어요." })).toBeVisible();
  await section.getByLabel("내림 사유", { exact: true }).selectOption("원작자 삭제 요청");
  const memo = section.getByLabel("메모 (200자)", { exact: true });
  await expect(memo).toHaveAttribute("maxlength", "200");
  await expect(memo).toHaveAccessibleDescription("요청한 사람의 이름·연락처는 적지 마세요.");
  await memo.fill("  접수 후 확인 중  ");
  const before = structuredClone(db.takedownLog[0]);
  const update = page.waitForRequest((req) => req.url().includes("/rest/v1/takedown_log?") && req.method() === "PATCH");
  await section.getByRole("button", { name: "사유 저장", exact: true }).click();
  const req = await update;
  expect(req.postDataJSON()).toEqual({ reason: "원작자 삭제 요청", memo: "접수 후 확인 중" });
  expect(new URL(req.url()).searchParams.get("id")).toBe(`eq.${before.id}`);
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 내림 사유를 저장했어요." })).toBeVisible();
  await expect(section.getByRole("listitem")).toContainText("숨김 · 원작자 삭제 요청 · 접수 후 확인 중");
  expect(db.takedownLog[0]).toEqual({ ...before, reason: "원작자 삭제 요청", memo: "접수 후 확인 중" });
  await noA11y(page);
  for (const control of await section.getByRole("textbox").or(section.getByRole("combobox")).or(section.getByRole("button")).all()) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/admin-takedown-${info.project.name}.png`, fullPage: true });
  const show = page.waitForRequest((request) => request.url().includes("/rest/v1/takedown_log") && request.method() === "POST");
  await row.getByRole("switch").click();
  expect((await show).postDataJSON()).toEqual({ food_slug: "dubai-chocolate", action: "show" });
  await expect(section).toHaveCount(0);
  expect(db.foods[0].hidden).toBe(false);
  expect(db.takedownLog).toHaveLength(2);
  expect(db.takedownLog[1].action).toBe("show");
});

test("내림 기록 표 없음: 숨김·다시 보임과 다른 편집 유지", async ({ page }) => {
  const db = await installFake(page);
  db.failTakedown = true;
  const row = await openBasicInfo(page);
  await row.getByRole("switch").click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿을(를) 숨겼어요. 다만 내림 기록을 남기지 못했어요: table takedown_log does not exist" })).toBeVisible();
  expect(db.foods[0].hidden).toBe(true);
  const section = row.getByRole("group", { name: "내림 기록", exact: true });
  await expect(section).toHaveText("내림 기록내림 기록을 못 불러왔어요. Supabase SQL Editor 에서 web/supabase/migrations/0003_takedown_log.sql 을 먼저 실행해 주세요.");
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect(section.getByRole("listitem")).toHaveCount(0);
  await row.getByRole("button", { name: "글 고치기", exact: true }).click();
  await row.getByLabel("한 줄 설명 (200자)").fill("내림 기록 없이 글 편집");
  await row.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 글을 저장했어요." })).toBeVisible();
  expect(db.foods[0].why).toBe("내림 기록 없이 글 편집");
  await row.getByRole("switch").click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿을(를) 다시 보이게 했어요. 다만 내림 기록을 남기지 못했어요: table takedown_log does not exist" })).toBeVisible();
  expect(db.foods[0].hidden).toBe(false);
  await expect(section).toHaveCount(0);
});

test("내림 기록: 음식별 최신 5개와 가장 최근 hide 한 줄만 수정", async ({ page }) => {
  const db = await installFake(page);
  db.foods[0].hidden = true;
  for (let id = 1; id <= 7; id++) db.takedownLog.push({ id, food_slug: "dubai-chocolate", action: id % 2 ? "hide" : "show", reason: "", memo: `기록 ${id}`, created_at: `2026-11-${String(id).padStart(2, "0")}T00:00:00Z` });
  db.takedownLog.push({ id: 8, food_slug: "chicken-mayo-deopbap", action: "hide", reason: "", memo: "다른 음식", created_at: "2026-11-11T00:00:00Z" });
  await login(page);
  const section = page.getByRole("group", { name: "내림 기록", exact: true });
  await expect(section.getByRole("listitem")).toHaveCount(5);
  await expect(section.getByRole("listitem").first()).toContainText("기록 7");
  await expect(section.getByRole("listitem").last()).toContainText("기록 3");
  const before = structuredClone(db.takedownLog);
  await section.getByLabel("내림 사유", { exact: true }).selectOption("내용 오류");
  await section.getByRole("button", { name: "사유 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 내림 사유를 저장했어요." })).toBeVisible();
  expect(db.takedownLog).toEqual(before.map((entry) => entry.id === 7 ? { ...entry, reason: "내용 오류" } : entry));
});

test("내림 기록: 가장 최근 show면 사유 폼 없이 목록만 표시", async ({ page }) => {
  const db = await installFake(page);
  db.foods[0].hidden = true;
  db.takedownLog.push({ id: 1, food_slug: "dubai-chocolate", action: "show", reason: "", memo: "", created_at: "2026-11-11T00:00:00Z" });
  await login(page);
  const section = page.getByRole("group", { name: "내림 기록", exact: true });
  await expect(section.getByRole("listitem")).toContainText("다시 보임 · 사유 없음");
  await expect(section.getByRole("combobox")).toHaveCount(0);
  await expect(section.getByRole("button")).toHaveCount(0);
});

test("내림 기록: 사유 저장 실패는 기록과 입력 유지", async ({ page }) => {
  const db = await installFake(page);
  await login(page);
  await page.getByRole("switch").first().click();
  const section = page.getByRole("group", { name: "내림 기록", exact: true });
  await section.getByLabel("내림 사유", { exact: true }).selectOption("기타");
  await page.route(`${SUPABASE}/rest/v1/takedown_log?**`, (route) => route.request().method() === "PATCH" ? json(route, { message: "사유 저장 시험 오류" }, 500) : route.fallback());
  await section.getByRole("button", { name: "사유 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "저장하지 못했어요: 사유 저장 시험 오류" })).toBeVisible();
  await expect(section.getByLabel("내림 사유", { exact: true })).toHaveValue("기타");
  expect(db.takedownLog[0].reason).toBe("");
});

test("내림 기록: 숨김 저장 실패면 기록 요청 없음", async ({ page }) => {
  const db = await installFake(page);
  await login(page);
  await page.route(`${SUPABASE}/rest/v1/foods?**`, (route) => route.request().method() === "PATCH" ? json(route, { message: "숨김 시험 오류" }, 500) : route.fallback());
  await page.getByRole("switch").first().click();
  await expect(page.getByRole("status").filter({ hasText: "저장하지 못했어요: 숨김 시험 오류" })).toBeVisible();
  expect(db.foods[0].hidden).toBe(false);
  expect(db.takedownLog).toEqual([]);
  await expect(page.getByRole("group", { name: "내림 기록", exact: true })).toHaveCount(0);
});

test("내림 기록 로딩: 응답 전 폼·버튼 없이 불러오는 중 표시", async ({ page }) => {
  await installFake(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`${SUPABASE}/rest/v1/takedown_log?**`, async (route) => {
    if (route.request().method() === "GET") await pending;
    await route.fallback();
  });
  await login(page);
  await page.getByRole("switch").first().click();
  const section = page.getByRole("group", { name: "내림 기록", exact: true });
  try {
    await expect(section).toContainText("불러오는 중이에요…");
    await expect(section.getByRole("button")).toHaveCount(0);
    await expect(section.getByRole("combobox")).toHaveCount(0);
  } finally { release(); }
  await expect(section.getByRole("button", { name: "사유 저장", exact: true })).toBeVisible();
  await noA11y(page);
});

test("원본 영상: 주소에서 ID만 저장·목록 재조회·확인 링크·비우면 내림", async ({ page }) => {
  const db = await installFake(page);
  const before = structuredClone(db.foods[0]);
  const row = await openDetails(page);
  const input = row.getByLabel("YouTube 주소 또는 영상 ID", { exact: true });
  const save = row.getByRole("button", { name: "영상 저장", exact: true });
  await expect(input).toHaveValue("");
  await input.fill("https://youtu.be/AbCdEfGhI_1?si=x");
  const request = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "PATCH");
  const reload = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "GET");
  await save.click();
  expect((await request).postDataJSON()).toEqual({ video_id: "AbCdEfGhI_1" });
  expect(new URL((await reload).url()).searchParams.get("select")).toBe("*");
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 영상을 저장했어요. '사이트에 반영'을 눌러 주세요." })).toBeVisible();
  await expect(row.getByRole("link", { name: "YouTube에서 확인", exact: true })).toHaveAttribute("href", "https://www.youtube.com/watch?v=AbCdEfGhI_1");
  await expect(input).toHaveValue("AbCdEfGhI_1");
  await expect(save).toBeEnabled();
  expect(db.foods[0]).toEqual({ ...before, video_id: "AbCdEfGhI_1" });
  await input.fill(" ");
  const remove = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "PATCH");
  await save.click();
  expect((await remove).postDataJSON()).toEqual({ video_id: null });
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 영상을 내렸어요. '사이트에 반영'을 눌러 주세요." })).toBeVisible();
  await expect(row.getByRole("link", { name: "YouTube에서 확인", exact: true })).toHaveCount(0);
  expect(db.foods[0]).toEqual(before);
});

test("원본 영상 검증: 잘못된 주소는 저장 요청 없이 안내", async ({ page }) => {
  const db = await installFake(page);
  const requests: string[] = [];
  page.on("request", (req) => { if (req.url().startsWith(SUPABASE) && req.method() === "PATCH") requests.push(req.url()); });
  const row = await openDetails(page);
  await row.getByLabel("YouTube 주소 또는 영상 ID", { exact: true }).fill("https://youtube.com.evil.com/watch?v=AbCdEfGhI_1");
  await row.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "YouTube 주소나 11자 영상 ID를 적어 주세요." })).toBeVisible();
  expect(db.writes).toEqual([]);
  expect(requests).toEqual([]);
});

test("원본 영상 열 없음: 안내만 표시하고 사진 저장은 유지", async ({ page }) => {
  const db = await installFake(page);
  delete db.foods[0].video_id;
  const queries: string[] = [];
  page.on("request", (req) => { if (req.url().includes("/rest/v1/foods?") && req.method() === "GET") queries.push(new URL(req.url()).searchParams.get("select")!); });
  const row = await openDetails(page);
  const video = row.getByRole("group", { name: "원본 영상", exact: true });
  await expect(video.getByText("DB 에 영상 칸이 아직 없어요. Supabase SQL Editor 에서 web/supabase/migrations/0002_video.sql 을 먼저 실행해 주세요.", { exact: true })).toBeVisible();
  await expect(video.getByRole("textbox")).toHaveCount(0);
  await expect(video.getByRole("button")).toHaveCount(0);
  await row.getByLabel("사진 설명 (화면을 못 보는 사람에게 읽어 주는 글, 120자)").fill("새 사진 설명");
  const reload = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "GET");
  await row.getByRole("button", { name: "사진 저장", exact: true }).click();
  await reload;
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 사진을 저장했어요." })).toBeVisible();
  expect(db.foods[0].alt).toBe("새 사진 설명");
  expect(db.foods[0]).not.toHaveProperty("video_id");
  expect(queries.length).toBeGreaterThanOrEqual(2);
  expect(queries.every((query) => query === "*")).toBe(true);
});

test("원본 영상 저장 오류: 실패 알림과 기존 ID·입력 유지", async ({ page }) => {
  const db = await installFake(page);
  db.foods[0].video_id = "trendfood01";
  const row = await openDetails(page);
  await expect(row.getByLabel("YouTube 주소 또는 영상 ID", { exact: true })).toHaveValue("trendfood01");
  await page.route(`${SUPABASE}/rest/v1/foods?**`, async (route) => {
    if (route.request().method() === "PATCH") return json(route, { message: "영상 저장 시험 오류" }, 500);
    return route.fallback();
  });
  await row.getByLabel("YouTube 주소 또는 영상 ID", { exact: true }).fill("AbCdEfGhI_1");
  await row.getByRole("button", { name: "영상 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "저장하지 못했어요: 영상 저장 시험 오류" })).toBeVisible();
  expect(db.foods[0].video_id).toBe("trendfood01");
  await expect(row.getByLabel("YouTube 주소 또는 영상 ID", { exact: true })).toHaveValue("AbCdEfGhI_1");
});

test("원본 영상 접근성: 즉시 입력·44px·iframe 없음·axe·가로 넘침·스크린샷", async ({ page }, info) => {
  const db = await installFake(page);
  db.foods[0].video_id = "trendfood01";
  const row = await openDetails(page);
  const video = row.getByRole("group", { name: "원본 영상", exact: true });
  await expect(video.getByLabel("YouTube 주소 또는 영상 ID", { exact: true })).toBeEnabled();
  await expect(video.getByRole("link", { name: "YouTube에서 확인", exact: true })).toHaveAttribute("href", "https://www.youtube.com/watch?v=trendfood01");
  await expect(page.locator("iframe")).toHaveCount(0);
  for (const element of await video.locator("input, button, a").all()) expect((await element.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await noA11y(page);
  await page.screenshot({ path: `test-results/admin-video-${info.project.name}.png`, fullPage: true });
});

test("기본 정보: 8개 열만 저장하고 이름을 다시 불러오며 주소·사진·재료 보존", async ({ page }) => {
  const db = await installFake(page);
  const before = structuredClone(db.foods[0]);
  const ingredients = structuredClone(db.ingredients);
  const row = await openBasicInfo(page);
  await row.getByLabel("이름 (30자)", { exact: true }).fill(" 새 초콜릿 ");
  await row.getByLabel("카테고리", { exact: true }).selectOption("간식");
  await row.getByRole("checkbox", { name: "디저트", exact: true }).uncheck();
  await row.getByRole("checkbox", { name: "안주", exact: true }).check();
  await row.getByRole("checkbox", { name: "10분컷", exact: true }).check();
  await row.getByLabel("조리 시간 (분)", { exact: true }).fill(" 40 ");
  await row.getByLabel(cookLabel, { exact: true }).fill(" 조리 40분, 굳히기 1시간 ");
  await row.getByLabel("난이도", { exact: true }).selectOption("어려움");
  await row.getByLabel("분량 (예: 2인분, 20자)", { exact: true }).fill(" 4인분 ");
  await row.getByLabel(changeLabel, { exact: true }).fill(" 3계단 올랐어요 ");
  const request = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "PATCH");
  await row.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
  const expected = { name: "새 초콜릿", category: "간식", tags: ["10분컷", "안주"], cook_minutes: 40, cook_label: "조리 40분, 굳히기 1시간", difficulty: "어려움", servings: "4인분", change_label: "3계단 올랐어요" };
  expect((await request).postDataJSON()).toEqual(expected);
  await expect(page.getByRole("status").filter({ hasText: "새 초콜릿 기본 정보를 저장했어요. '사이트에 반영'을 눌러 주세요." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "새 초콜릿", exact: true })).toBeVisible();
  expect(db.foods[0]).toEqual({ ...before, ...expected });
  expect(db.ingredients).toEqual(ingredients);
});

test("기본 정보 검증: 빈 이름·31자·조리 시간 0·1441·소수·빈 변동 문구는 요청 없음", async ({ page }) => {
  const db = await installFake(page);
  const requests: string[] = [];
  page.on("request", (req) => { if (req.url().startsWith(SUPABASE) && req.method() === "PATCH") requests.push(req.url()); });
  const row = await openBasicInfo(page);
  const name = row.getByLabel("이름 (30자)", { exact: true });
  await expect(name).toHaveAttribute("maxlength", "30");
  await expect(row.getByLabel(cookLabel, { exact: true })).toHaveAttribute("maxlength", "40");
  await expect(row.getByLabel("분량 (예: 2인분, 20자)", { exact: true })).toHaveAttribute("maxlength", "20");
  await expect(row.getByLabel(changeLabel, { exact: true })).toHaveAttribute("maxlength", "30");
  // 입력 제한을 우회해 들어온 31자도 순수 함수가 거부하는지 확인한다.
  await name.evaluate((input) => input.removeAttribute("maxlength"));
  for (const value of [" ", "가".repeat(31)]) {
    await name.fill(value);
    await row.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "이름을 1~30자로 적어 주세요." })).toBeVisible();
  }
  await name.fill("두바이 초콜릿");
  for (const value of ["0", "1441", "1.5"]) {
    await row.getByLabel("조리 시간 (분)", { exact: true }).fill(value);
    await row.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "조리 시간은 1~1440 사이의 분으로 적어 주세요." })).toBeVisible();
  }
  await row.getByLabel("조리 시간 (분)", { exact: true }).fill("10");
  await row.getByLabel(changeLabel, { exact: true }).fill(" ");
  await row.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "순위 변동 문구를 적어 주세요." })).toBeVisible();
  expect(db.writes).toEqual([]);
  expect(requests).toEqual([]);
});

test("기본 정보 조리 문구: 자동 문구는 빈 입력·분만 바꾸면 빈 문자열 저장, 직접 쓴 문구 유지", async ({ page }) => {
  const db = await installFake(page);
  db.foods[1].cook_minutes = 40;
  db.foods[1].cook_label = "조리 40분, 굳히기 1시간";
  const row = await openBasicInfo(page);
  await expect(row.getByLabel(cookLabel, { exact: true })).toHaveValue("");
  await row.getByLabel("조리 시간 (분)", { exact: true }).fill("15");
  await row.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 기본 정보를 저장했어요." })).toBeVisible();
  expect(db.foods[0]).toMatchObject({ cook_minutes: 15, cook_label: "", tags: ["디저트"] });
  const other = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "치킨마요 덮밥", exact: true }) });
  await other.getByRole("button", { name: "기본 정보 고치기", exact: true }).click();
  await expect(other.getByLabel(cookLabel, { exact: true })).toHaveValue("조리 40분, 굳히기 1시간");
  await other.getByRole("checkbox", { name: "디저트", exact: true }).uncheck();
  await other.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "치킨마요 덮밥 기본 정보를 저장했어요." })).toBeVisible();
  expect(db.foods[1]).toMatchObject({ cook_label: "조리 40분, 굳히기 1시간", tags: [] });
});

test("기본 정보 저장 오류: 실패 알림과 기존 이름·입력 유지", async ({ page }) => {
  const db = await installFake(page);
  const row = await openBasicInfo(page);
  await page.route(`${SUPABASE}/rest/v1/foods?**`, async (route) => {
    if (route.request().method() === "PATCH") return json(route, { message: "기본 정보 저장 시험 오류" }, 500);
    await route.fallback();
  });
  await row.getByLabel("이름 (30자)", { exact: true }).fill("저장 실패 이름");
  await row.getByRole("button", { name: "기본 정보 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "저장하지 못했어요: 기본 정보 저장 시험 오류" })).toBeVisible();
  await expect(row.getByLabel("이름 (30자)", { exact: true })).toHaveValue("저장 실패 이름");
  expect(db.foods[0].name).toBe("두바이 초콜릿");
  expect(db.writes).toEqual([]);
});

test("기본 정보 편집: 세 편집 버튼은 하나만 펼치며 즉시 입력·접근성·가로 넘침 검사", async ({ page }, info) => {
  await installFake(page);
  const row = await openBasicInfo(page);
  const basic = row.getByRole("button", { name: "기본 정보 고치기", exact: true });
  const text = row.getByRole("button", { name: "글 고치기", exact: true });
  const details = row.getByRole("button", { name: "사진·재료·조리법 고치기", exact: true });
  await expect(basic).toHaveAttribute("aria-expanded", "true");
  await expect(row.getByRole("button", { name: "기본 정보 저장", exact: true })).toBeEnabled();
  await basic.click();
  await expect(row.getByRole("group", { name: "기본 정보", exact: true })).toHaveCount(0);
  await basic.click();
  await text.click();
  await expect(basic).toHaveAttribute("aria-expanded", "false");
  await expect(row.getByRole("group", { name: "기본 정보", exact: true })).toHaveCount(0);
  await details.click();
  await expect(text).toHaveAttribute("aria-expanded", "false");
  await expect(row.getByLabel("한 줄 설명 (200자)")).toHaveCount(0);
  await basic.click();
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await expect(row.getByRole("group", { name: "사진", exact: true })).toHaveCount(0);
  await expect(row.getByRole("group", { name: "재료", exact: true })).toHaveCount(0);
  const other = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "치킨마요 덮밥", exact: true }) });
  await other.getByRole("button", { name: "글 고치기", exact: true }).click();
  await expect(basic).toHaveAttribute("aria-expanded", "false");
  await basic.click();
  await expect(page.getByRole("button", { expanded: true, name: /고치기$/ })).toHaveCount(1);
  await expect(row.getByText("이름을 바꿔도 페이지 주소는 그대로예요.", { exact: true })).toBeVisible();
  await noA11y(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/admin-basic-info-${info.project.name}.png`, fullPage: true });
});

test("사진 편집: 설명 필수, 키 변경 시 히어로 초기화, 같은 키면 히어로 보존", async ({ page }) => {
  const db = await installFake(page);
  const row = await openDetails(page);
  const description = row.getByRole("textbox", { name: "사진 설명 (화면을 못 보는 사람에게 읽어 주는 글, 120자)" });
  await description.fill("  ");
  await row.getByRole("button", { name: "사진 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "사진 설명을 적어 주세요." })).toBeVisible();
  expect(db.writes).toEqual([]);
  expect(db.foods[0].image).toBe("dubai");
  await description.fill(" 기존 사진 설명 ");
  await row.getByRole("button", { name: "사진 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 사진을 저장했어요." })).toBeVisible();
  expect(db.foods[0]).toMatchObject({ alt: "기존 사진 설명", hero_image: "dubai2", hero_alt: "히어로 사진" });
  await row.getByRole("combobox", { name: "사진 고르기" }).selectOption("bagel");
  await description.fill("베이글 단면");
  await row.getByRole("button", { name: "사진 저장", exact: true }).click();
  await expect.poll(() => db.foods[0].image).toBe("bagel");
  expect(db.foods[0]).toMatchObject({ image: "bagel", alt: "베이글 단면", hero_image: null, hero_alt: null });
});

test("재료 편집: 추가·이름·체크·순서·삭제를 저장하고 기존 가격·쿠팡 링크 보존", async ({ page }) => {
  const db = await installFake(page);
  db.ingredients[0].url = "https://link.coupang.com/a/keep";
  db.ingredients[1].url = "https://link.coupang.com/a/remove";
  const row = await openDetails(page);
  await row.getByRole("textbox", { name: "재료 이름", exact: true }).nth(0).fill(" 볶은 카다이프 ");
  await row.getByRole("checkbox", { name: "집에 흔히 있어요" }).nth(0).check();
  await row.getByRole("button", { name: "재료 추가", exact: true }).click();
  await row.getByRole("textbox", { name: "재료 이름", exact: true }).nth(2).fill("버터");
  await row.getByRole("button", { name: "버터 위로", exact: true }).click();
  await row.getByRole("button", { name: "버터 위로", exact: true }).click();
  await row.getByRole("button", { name: "피스타치오 스프레드 삭제", exact: true }).click();
  await expect(row.getByRole("textbox", { name: "재료 이름", exact: true })).toHaveCount(3);
  await row.getByRole("button", { name: "링크도 지워져요. 정말 삭제", exact: true }).click();
  await expect(row.getByRole("textbox", { name: "재료 이름", exact: true })).toHaveCount(2);
  expect(db.writes).toEqual([]);
  await row.getByRole("button", { name: "재료 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 재료를 저장했어요." })).toBeVisible();
  expect(db.ingredients.map(({ name, position }) => ({ name, position })).sort((a, b) => a.position - b.position)).toEqual([{ name: "버터", position: 0 }, { name: "볶은 카다이프", position: 1 }]);
  expect(db.ingredients.find((i) => i.id === 1)).toMatchObject({ price: 12900, url: "https://link.coupang.com/a/keep", hard: true, pantry: true });
});

test("재료 검증: 빈 이름·중복·빈 목록은 저장하지 않는다", async ({ page }) => {
  const db = await installFake(page);
  const row = await openDetails(page);
  const names = row.getByRole("textbox", { name: "재료 이름", exact: true });
  await names.nth(0).fill(" ");
  await row.getByRole("button", { name: "재료 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "이름이 비어 있는 재료가 있어요." })).toBeVisible();
  await names.nth(0).fill(" 피스타치오 스프레드 ");
  await row.getByRole("button", { name: "재료 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "같은 이름의 재료가 두 번 있어요: 피스타치오 스프레드" })).toBeVisible();
  await names.nth(0).fill("카다이프");
  await row.getByRole("button", { name: "카다이프 삭제", exact: true }).click();
  await row.getByRole("button", { name: "피스타치오 스프레드 삭제", exact: true }).click();
  await row.getByRole("button", { name: "재료 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "재료를 하나 이상 적어 주세요." })).toBeVisible();
  expect(db.writes).toEqual([]);
});

test("재료 저장 오류: 이름 맞바꾸기 충돌과 일부 저장 실패 시 성공 알림 없이 DB 목록 재조회", async ({ page }) => {
  const db = await installFake(page);
  db.ingredients[0].url = "https://link.coupang.com/a/keep";
  const row = await openDetails(page);
  const names = row.getByRole("textbox", { name: "재료 이름", exact: true });
  await names.nth(0).fill("피스타치오 스프레드");
  await names.nth(1).fill("카다이프");
  await row.getByRole("button", { name: "재료 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "저장하지 못했어요: duplicate key" })).toBeVisible();
  await expect(names.nth(0)).toHaveValue("카다이프");
  db.failIngredientName = "시험 재료";
  await names.nth(0).fill("볶은 카다이프");
  await names.nth(1).fill("시험 재료");
  await row.getByRole("button", { name: "재료 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "저장하지 못했어요: 재료 저장 시험 오류" })).toBeVisible();
  await expect(names.nth(0)).toHaveValue("볶은 카다이프");
  await expect(names.nth(1)).toHaveValue("피스타치오 스프레드");
  expect(db.ingredients[0]).toMatchObject({ price: 12900, url: "https://link.coupang.com/a/keep" });
});

test("조리법 편집: 단계 추가·순서·타이머·삭제 후 공백을 정리해 저장", async ({ page }) => {
  const db = await installFake(page);
  const row = await openDetails(page);
  await row.getByRole("button", { name: "단계 추가", exact: true }).click();
  await row.getByRole("textbox", { name: "3단계 내용", exact: true }).fill(" 굽기 ");
  await row.getByRole("textbox", { name: "타이머(분, 없으면 비워 두기)", exact: true }).nth(2).fill("5");
  await row.getByRole("button", { name: "3단계 위로", exact: true }).click();
  await row.getByRole("button", { name: "1단계 삭제", exact: true }).click();
  await row.getByRole("textbox", { name: "타이머(분, 없으면 비워 두기)", exact: true }).nth(1).fill("");
  await row.getByRole("button", { name: "조리법 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 조리법을 저장했어요." })).toBeVisible();
  expect(db.foods[0].steps).toEqual([{ text: "굽기", timerMinutes: 5 }, { text: "식혀요" }]);
});

test("조리법 검증: 빈 단계·범위 밖 타이머·빈 목록은 저장하지 않는다", async ({ page }) => {
  const db = await installFake(page);
  const row = await openDetails(page);
  await row.getByRole("textbox", { name: "1단계 내용", exact: true }).fill(" ");
  await row.getByRole("button", { name: "조리법 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "비어 있는 단계가 있어요. 내용을 적거나 삭제해 주세요." })).toBeVisible();
  await row.getByRole("textbox", { name: "1단계 내용", exact: true }).fill("섞어요");
  for (const timer of ["0", "1441", "1.5"]) {
    await row.getByRole("textbox", { name: "타이머(분, 없으면 비워 두기)", exact: true }).nth(0).fill(timer);
    await row.getByRole("button", { name: "조리법 저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "타이머는 1~1440 사이의 분으로 적어 주세요." })).toBeVisible();
  }
  await row.getByRole("button", { name: "2단계 삭제", exact: true }).click();
  await row.getByRole("button", { name: "1단계 삭제", exact: true }).click();
  await row.getByRole("button", { name: "조리법 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "조리 단계를 하나 이상 적어 주세요." })).toBeVisible();
  expect(db.writes).toEqual([]);
});

test("사서 맛보기 편집: 수정·추가·순서 변경 후 convenience 열만 저장하고 다시 불러온다", async ({ page }) => {
  const db = await installFake(page);
  const before = structuredClone(db.foods[0]);
  const lists: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "GET" && req.url().includes("/rest/v1/foods?")) lists.push(req.url());
  });
  const row = await openDetails(page);
  await expect(row.getByRole("textbox", { name: "사서 맛보기 1 파는 곳", exact: true })).toHaveValue("편의점");
  await expect(row.getByRole("textbox", { name: "사서 맛보기 1 파는 곳", exact: true })).toHaveAttribute("maxlength", "30");
  await expect(row.getByRole("textbox", { name: "사서 맛보기 1 설명", exact: true })).toHaveAttribute("maxlength", "80");
  expect(new URL(lists[0]).searchParams.get("select")).toBe("*");
  await row.getByRole("textbox", { name: "사서 맛보기 1 파는 곳", exact: true }).fill(" 동네 편의점 ");
  await row.getByRole("textbox", { name: "사서 맛보기 1 설명", exact: true }).fill(" 초콜릿 신제품 ");
  await row.getByRole("button", { name: "파는 곳 추가", exact: true }).click();
  await row.getByRole("textbox", { name: "사서 맛보기 3 파는 곳", exact: true }).fill(" 백화점 ");
  await row.getByRole("textbox", { name: "사서 맛보기 3 설명", exact: true }).fill(" 디저트 코너 ");
  await row.getByRole("button", { name: "사서 맛보기 3 위로", exact: true }).click();
  await row.getByRole("button", { name: "사서 맛보기 1 아래로", exact: true }).click();
  const expected = [{ place: "백화점", desc: "디저트 코너" }, { place: "동네 편의점", desc: "초콜릿 신제품" }, { place: "마트", desc: "쿠키" }];
  const count = lists.length;
  const request = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "PATCH");
  await row.getByRole("button", { name: "사서 맛보기 저장", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ convenience: expected });
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 사서 맛보기를 저장했어요. '사이트에 반영'을 눌러 주세요." })).toBeVisible();
  await expect.poll(() => lists.length).toBeGreaterThan(count);
  expect(db.foods[0]).toEqual({ ...before, convenience: expected });
  await row.getByRole("button", { name: "사진·재료·조리법 고치기", exact: true }).click();
  await row.getByRole("button", { name: "사진·재료·조리법 고치기", exact: true }).click();
  await expect(row.getByRole("textbox", { name: "사서 맛보기 1 파는 곳", exact: true })).toHaveValue("백화점");
});

test("사서 맛보기 편집: 모든 줄을 삭제하면 빈 배열로 저장한다", async ({ page }) => {
  const db = await installFake(page);
  const row = await openDetails(page);
  await row.getByRole("button", { name: "사서 맛보기 2 삭제", exact: true }).click();
  await row.getByRole("button", { name: "사서 맛보기 1 삭제", exact: true }).click();
  const request = page.waitForRequest((req) => req.url().includes("/rest/v1/foods?") && req.method() === "PATCH");
  await row.getByRole("button", { name: "사서 맛보기 저장", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ convenience: [] });
  await expect(page.getByRole("status").filter({ hasText: "두바이 초콜릿 사서 맛보기를 저장했어요." })).toBeVisible();
  expect(db.foods[0].convenience).toEqual([]);
});

test("사서 맛보기 검증: 빈 칸·중복 파는 곳·6줄에서 추가는 저장 요청 없음", async ({ page }) => {
  const db = await installFake(page);
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "PATCH") requests.push(req.url());
  });
  const row = await openDetails(page);
  await row.getByRole("textbox", { name: "사서 맛보기 1 설명", exact: true }).fill(" ");
  await row.getByRole("button", { name: "사서 맛보기 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "파는 곳과 설명을 모두 적어 주세요. 안 쓰는 줄은 삭제해 주세요." })).toBeVisible();
  await row.getByRole("textbox", { name: "사서 맛보기 1 설명", exact: true }).fill("초콜릿 바");
  await row.getByRole("textbox", { name: "사서 맛보기 2 파는 곳", exact: true }).fill(" 편의점 ");
  await row.getByRole("button", { name: "사서 맛보기 저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "파는 곳 이름이 겹쳐요. 하나로 합쳐 주세요." })).toBeVisible();
  for (let i = 2; i < 6; i++) await row.getByRole("button", { name: "파는 곳 추가", exact: true }).click();
  await row.getByRole("button", { name: "파는 곳 추가", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "사서 맛보기는 6개까지 적을 수 있어요." })).toBeVisible();
  await expect(row.getByRole("textbox", { name: /사서 맛보기 \d+ 파는 곳/ })).toHaveCount(6);
  expect(requests).toEqual([]);
  expect(db.writes).toEqual([]);
});

test("사서 맛보기 접근성: 펼친 구역 axe·44px 입력과 버튼·가로 넘침·스크린샷", async ({ page }, info) => {
  await installFake(page);
  const row = await openDetails(page);
  const section = row.getByRole("group", { name: "사서 맛보기", exact: true });
  await expect(section).toBeVisible();
  await expect(section.getByText("편의점·마트처럼 사서 맛볼 수 있는 곳이에요. 하나도 없으면 상세 화면에 이 구역이 안 보여요.", { exact: true })).toBeVisible();
  await noA11y(page);
  for (const control of await section.getByRole("textbox").or(section.getByRole("button")).all()) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/admin-convenience-${info.project.name}.png`, fullPage: true });
});

test("상세 편집: 글 편집과 상호 배타적이며 펼친 화면 접근성·가로 넘침 검사", async ({ page }, info) => {
  await installFake(page);
  const row = await openDetails(page);
  const details = row.getByRole("button", { name: "사진·재료·조리법 고치기", exact: true });
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await row.getByRole("button", { name: "글 고치기", exact: true }).click();
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await expect(row.getByRole("textbox", { name: "한 줄 설명 (200자)" })).toBeVisible();
  await details.click();
  await expect(row.getByRole("textbox", { name: "한 줄 설명 (200자)" })).toHaveCount(0);
  await expect(row.getByRole("textbox", { name: "재료 이름", exact: true })).toHaveCount(2);
  await noA11y(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/admin-details-${info.project.name}.png`, fullPage: true });
});

test("편집 입력 제한: 사진 설명 120자·재료 이름 60자·단계 300자, 재료 30개·단계 20개", async ({ page }) => {
  const db = await installFake(page);
  const row = await openDetails(page);
  await expect(row.getByRole("textbox", { name: "사진 설명 (화면을 못 보는 사람에게 읽어 주는 글, 120자)" })).toHaveAttribute("maxlength", "120");
  await expect(row.getByRole("textbox", { name: "재료 이름", exact: true }).first()).toHaveAttribute("maxlength", "60");
  await expect(row.getByRole("textbox", { name: "1단계 내용", exact: true })).toHaveAttribute("maxlength", "300");
  for (let i = 2; i < 30; i++) await row.getByRole("button", { name: "재료 추가", exact: true }).click();
  await expect(row.getByRole("textbox", { name: "재료 이름", exact: true })).toHaveCount(30);
  await expect(row.getByRole("button", { name: "재료 추가", exact: true })).toBeDisabled();
  for (let i = 2; i < 20; i++) await row.getByRole("button", { name: "단계 추가", exact: true }).click();
  await expect(row.getByRole("textbox", { name: /단계 내용$/ })).toHaveCount(20);
  await expect(row.getByRole("button", { name: "단계 추가", exact: true })).toBeDisabled();
  expect(db.writes).toEqual([]);
});

test("재료 로딩: 응답 전에는 편집 버튼을 그리지 않고 로딩 후 전환 없이 표시한다", async ({ page }) => {
  await installFake(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`${SUPABASE}/rest/v1/ingredients?**`, async (route) => {
    if (route.request().method() === "GET") await pending;
    await route.fallback();
  });
  await login(page);
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "두바이 초콜릿", exact: true }) })
    .getByRole("button", { name: "사진·재료·조리법 고치기", exact: true }).click();
  const ingredients = page.getByRole("group", { name: "재료", exact: true });
  try {
    await expect(ingredients.getByRole("button")).toHaveCount(0);
    await expect(ingredients).toContainText("불러오는 중이에요…");
  } finally {
    release();
  }
  await expect(ingredients.getByRole("textbox", { name: "재료 이름", exact: true })).toHaveCount(2);
  await expect(ingredients.getByRole("button", { name: "재료 추가", exact: true })).toHaveCSS("opacity", "1");
  await noA11y(page);
});

test("관리자 화면은 공개 화면에 링크가 없고 검색엔진에서 빠지며, 운영자만 들어간다", async ({ page }) => {
  await installFake(page);
  await page.goto("/");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);

  await page.goto("/admin");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();

  await page.getByLabel("이메일").fill(ADMIN.email);
  await page.getByLabel("비밀번호").fill("wrong");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.locator("#login-error")).toHaveText("이메일이나 비밀번호가 맞지 않아요.");
  await noA11y(page);

  // 로그인은 되지만 운영자로 등록되지 않은 계정
  await login(page, STRANGER);
  await expect(page.getByRole("heading", { name: "관리자 권한이 없어요" })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();

  await login(page);
  await expect(page.getByRole("heading", { name: "게시 관리" })).toBeVisible();
  await expect(page.getByText("마지막 자동 수집")).toBeVisible();
  await noA11y(page);
});

test("게시 관리: 순서·숨기기·글 고치기 후 '사이트에 반영'", async ({ page }, info) => {
  const db = await installFake(page);
  await login(page);

  await page.getByRole("button", { name: "치킨마요 덮밥 위로" }).click();
  await expect(page.getByRole("status").filter({ hasText: "치킨마요 덮밥 순서를 올렸어요." })).toBeVisible();
  expect(db.foods.find((f) => f.slug === "chicken-mayo-deopbap")?.sort_order).toBeLessThan(
    db.foods.find((f) => f.slug === "dubai-chocolate")!.sort_order,
  );

  const row = page.locator("li", { hasText: "새우 로제 떡볶이" });
  await row.getByRole("switch").click();
  await expect(row.getByText("숨김", { exact: true })).toBeVisible();
  expect(db.foods.find((f) => f.slug === "shrimp-rose-tteokbokki")?.hidden).toBe(true);

  await row.getByRole("button", { name: "글 고치기" }).click();
  await row.getByLabel("한 줄 설명 (200자)").fill("바뀐 설명");
  await row.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "새우 로제 떡볶이 글을 저장했어요." })).toBeVisible();
  expect(db.foods.find((f) => f.slug === "shrimp-rose-tteokbokki")?.why).toBe("바뀐 설명");

  await page.getByRole("button", { name: "사이트에 반영" }).click();
  await expect(page.getByText("반영을 요청했어요.")).toBeVisible();
  expect(db.published).toHaveLength(1);

  await noA11y(page);
  await page.screenshot({ path: `test-results/admin-foods-${info.project.name}.png`, fullPage: true });
});

test("재료 링크: 쿠팡 주소만 저장된다", async ({ page }) => {
  const db = await installFake(page);
  await login(page);
  await page.getByRole("button", { name: "재료 링크" }).click();

  const row = page.locator("li", { hasText: "카다이프" });
  await row.getByLabel("쿠팡 주소").fill("https://evil.example.com/coupang.com");
  await row.getByRole("button", { name: "카다이프 저장" }).click();
  await expect(page.getByText("쿠팡 주소(https://…coupang.com 또는 coupa.ng)만 넣을 수 있어요.")).toBeVisible();
  expect(db.ingredients[0].url).toBeNull();

  await row.getByLabel("쿠팡 주소").fill("https://link.coupang.com/a/abc123");
  await row.getByLabel("참고 가격(원)").fill("13,500");
  await row.getByRole("button", { name: "카다이프 저장" }).click();
  await expect(page.getByText("카다이프 링크를 저장했어요.")).toBeVisible();
  expect(db.ingredients[0]).toMatchObject({ url: "https://link.coupang.com/a/abc123", price: 13500 });
  await noA11y(page);
});

test("후보 큐: 직접 추가·중복 막기·승인하면 초안 글이 생긴다", async ({ page }, info) => {
  const db = await installFake(page);
  await login(page);
  await page.getByRole("button", { name: "후보 큐" }).click();

  await page.getByLabel("음식 이름").fill("약과 쿠키");
  await page.getByLabel("카테고리").selectOption("디저트");
  await page.getByRole("button", { name: "후보 추가" }).click();
  await expect(page.getByText("약과 쿠키을(를) 후보에 넣었어요.")).toBeVisible();
  expect(db.candidates.at(-1)).toMatchObject({ name: "약과 쿠키", normalized: "약과쿠키", category: "디저트", origin: "manual" });

  await page.getByLabel("음식 이름").fill("약과쿠키");
  await page.getByRole("button", { name: "후보 추가" }).click();
  await expect(page.getByText("이번 주에 이미 있는 후보예요.")).toBeVisible();

  await page.getByRole("button", { name: "버터떡 승인" }).click();
  await expect(page.getByText("버터떡 승인. 게시 관리에 초안으로 들어갔어요.", { exact: false })).toBeVisible();
  expect(db.foods.find((f) => f.slug === "butter-tteok")).toMatchObject({ status: "draft", ai_drafted: true, name: "버터떡" });
  expect(db.ingredients.some((i) => i.food_slug === "butter-tteok" && i.name === "찹쌀가루")).toBe(true);
  expect(db.candidates[0].status).toBe("승인");

  await noA11y(page);
  await page.screenshot({ path: `test-results/admin-queue-${info.project.name}.png`, fullPage: true });
});
