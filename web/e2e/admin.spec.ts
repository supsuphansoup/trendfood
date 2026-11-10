import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route, test } from "@playwright/test";

// 관리자 화면은 브라우저에서 Supabase 와 직접 통신한다. 테스트에서는 그 통신을 가로채 가짜 Supabase 로 답한다.
// (실제 권한 검사는 DB 의 RLS 가 맡고, 그 부분은 supabase/migrations 를 PGlite 로 따로 검사했다)
const SUPABASE = "http://127.0.0.1:54321"; // playwright.config.ts 의 FAKE_SUPABASE
const ADMIN = { id: "11111111-1111-1111-1111-111111111111", email: "admin@trendfood.test", password: "correct-horse" };
const STRANGER = { id: "22222222-2222-2222-2222-222222222222", email: "guest@trendfood.test", password: "guest-pass" };

type Food = { slug: string; name: string; status: string; hidden: boolean; sort_order: number; why: string; summary: string; tip: string; ai_drafted: boolean; image: string; alt: string; hero_image: string | null; hero_alt: string | null; steps: { text: string; timerMinutes?: number }[] };

function makeFake() {
  const foods: Food[] = [
    ["dubai-chocolate", "두바이 초콜릿"],
    ["chicken-mayo-deopbap", "치킨마요 덮밥"],
    ["shrimp-rose-tteokbokki", "새우 로제 떡볶이"],
  ].map(([slug, name], i) => ({ slug, name, status: "published", hidden: false, sort_order: (i + 1) * 10, why: `${name} 설명`, summary: "요약", tip: "팁", ai_drafted: false, image: "dubai", alt: "초콜릿 사진", hero_image: "dubai2", hero_alt: "히어로 사진", steps: [{ text: "섞어요" }, { text: "식혀요", timerMinutes: 10 }] }));
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
  return { foods, ingredients, candidates, published, failIngredientName: "", writes: [] as string[] };
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
    const matches = (r: Record<string, unknown>) => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(r[key]) === value.slice(3));
    if (table === "admins") return json(route, f?.[1] === ADMIN.id ? [{ user_id: ADMIN.id }] : []);
    if (table === "pipeline_runs") return json(route, [{ started_at: "2026-11-04T21:00:00Z", finished_at: "2026-11-04T21:02:00Z", ok: true, summary: { inserted: 1 } }]);

    const rows: Record<string, unknown>[] =
      table === "foods" ? db.foods : table === "ingredients" ? db.ingredients : table === "candidates" ? db.candidates : [];
    if (method === "GET") {
      const list = rows.filter(matches);
      if (table === "foods") list.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      if (table === "ingredients") list.sort((a, b) => Number(a.position) - Number(b.position));
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
