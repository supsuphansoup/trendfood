import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route, test } from "@playwright/test";

// 관리자 화면은 브라우저에서 Supabase 와 직접 통신한다. 테스트에서는 그 통신을 가로채 가짜 Supabase 로 답한다.
// (실제 권한 검사는 DB 의 RLS 가 맡고, 그 부분은 supabase/migrations 를 PGlite 로 따로 검사했다)
const SUPABASE = "http://127.0.0.1:54321"; // playwright.config.ts 의 FAKE_SUPABASE
const ADMIN = { id: "11111111-1111-1111-1111-111111111111", email: "admin@trendfood.test", password: "correct-horse" };
const STRANGER = { id: "22222222-2222-2222-2222-222222222222", email: "guest@trendfood.test", password: "guest-pass" };

type Food = { slug: string; name: string; status: string; hidden: boolean; sort_order: number; why: string; summary: string; tip: string; ai_drafted: boolean };

function makeFake() {
  const foods: Food[] = [
    ["dubai-chocolate", "두바이 초콜릿"],
    ["chicken-mayo-deopbap", "치킨마요 덮밥"],
    ["shrimp-rose-tteokbokki", "새우 로제 떡볶이"],
  ].map(([slug, name], i) => ({ slug, name, status: "published", hidden: false, sort_order: (i + 1) * 10, why: `${name} 설명`, summary: "요약", tip: "팁", ai_drafted: false }));
  const ingredients = [
    { id: 1, food_slug: "dubai-chocolate", position: 0, name: "카다이프", price: 12900, url: null as string | null },
    { id: 2, food_slug: "dubai-chocolate", position: 1, name: "피스타치오 스프레드", price: null as number | null, url: null },
  ];
  const candidates: Record<string, unknown>[] = [
    {
      id: "c1", name: "버터떡", normalized: "버터떡", category: "간식", note: "영상 3개 언급", source: "", origin: "pipeline", status: "대기", score: 4.2,
      signals: { multiplier: 4.2, trend: [10, 20, 100], videos: 3 }, created_at: "2026-11-05T00:00:00Z", week: "2026-11-02",
      draft: { slug: "butter-tteok", why: "쫀득한 버터떡", summary: "검색량이 4.2배", ingredients: [{ name: "찹쌀가루" }], steps: [{ text: "섞는다" }], tip: "" },
    },
  ];
  const published: number[] = [];
  return { foods, ingredients, candidates, published };
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
    const f = eqFilter(url);
    if (table === "admins") return json(route, f?.[1] === ADMIN.id ? [{ user_id: ADMIN.id }] : []);
    if (table === "pipeline_runs") return json(route, [{ started_at: "2026-11-04T21:00:00Z", finished_at: "2026-11-04T21:02:00Z", ok: true, summary: { inserted: 1 } }]);

    const rows: Record<string, unknown>[] =
      table === "foods" ? db.foods : table === "ingredients" ? db.ingredients : table === "candidates" ? db.candidates : [];
    if (method === "GET") {
      const list = rows.filter((r) => !f || String(r[f[0]]) === f[1]);
      if (table === "foods") list.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      return json(route, list);
    }
    if (method === "PATCH") {
      const patch = req.postDataJSON();
      if (table === "ingredients" && patch.url && !/^https:\/\/([a-z0-9-]+\.)*(coupang\.com|coupa\.ng)(\/|$)/.test(patch.url)) {
        return json(route, { code: "23514", message: "check constraint" }, 400);
      }
      for (const r of rows) if (f && String(r[f[0]]) === f[1]) Object.assign(r, patch);
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    }
    if (method === "POST") {
      const body = req.postDataJSON();
      for (const item of Array.isArray(body) ? body : [body]) {
        if (table === "candidates" && db.candidates.some((c) => c.normalized === item.normalized)) {
          return json(route, { code: "23505", message: "duplicate key" }, 409);
        }
        rows.push({ id: `n${rows.length + 1}`, status: table === "candidates" ? "대기" : undefined, signals: {}, created_at: new Date().toISOString(), ...item });
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
  await expect(row.getByText("숨김")).toBeVisible();
  expect(db.foods.find((f) => f.slug === "shrimp-rose-tteokbokki")?.hidden).toBe(true);

  await row.getByRole("button", { name: "글 고치기" }).click();
  await row.getByLabel("한 줄 설명 (200자)").fill("바뀐 설명");
  await row.getByRole("button", { name: "저장" }).click();
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
