import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/youtube(?:-nocookie)?\.com\//, (route) => route.fulfill({ body: "" }));
  await page.route("https://www.googletagmanager.com/**", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.route(/google-analytics\.com\//, (route) => route.abort());
});

test("보유 재료 탐색은 순위와 별도로 부족한 재료를 보여주고 상세 체크리스트에 이어진다", async ({ page }, info) => {
  await page.goto("/");
  const original = await page.locator("#list li h3").allTextContents();
  const region = page.getByRole("region", { name: "보유 재료로 찾기" });
  await region.getByRole("checkbox", { name: "보유 재료로 찾기", exact: true }).check();
  await region.getByRole("searchbox", { name: "보유 재료 검색" }).fill("무염 버터");
  await region.getByRole("checkbox", { name: "무염 버터", exact: true }).check();
  await expect(page).toHaveURL(/pantry=1/);
  await expect(page.getByTestId("pantry-match").first()).toContainText(/개 재료 보유/);
  const matches = await page.getByTestId("pantry-match").allTextContents();
  const missing = matches.map((text) => Number(text.match(/부족한 재료 (\d+)개/)?.[1] ?? 0));
  expect(missing).toEqual([...missing].sort((a, b) => a - b));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/pantry-${info.project.name}.png`, fullPage: true });
  await region.getByRole("checkbox", { name: "보유 재료로 찾기", exact: true }).uncheck();
  expect(await page.locator("#list li h3").allTextContents()).toEqual(original);
  await page.goto("/food/butter-garaetteok");
  await expect(page.getByRole("checkbox", { name: /무염 버터/ })).not.toBeChecked();
});

test("보유 재료 탐색은 상세에서 돌아와도 유지되고 목록 주소에 재료 이름은 넣지 않는다", async ({ page }) => {
  await page.goto("/?pantry=1&year=2024");
  const toggle = page.getByRole("checkbox", { name: "보유 재료로 찾기", exact: true });
  await expect(toggle).toBeChecked();
  await expect(page.getByTestId("pantry-match").first()).toBeVisible();
  await expect(page).not.toHaveURL(/year=/);
  await page.locator("#list li h3 a").first().click();
  await page.goBack();
  await expect(toggle).toBeChecked();
  await expect(page.getByTestId("pantry-match").first()).toBeVisible();
});

test("저장 공간을 사용할 수 없어도 보유 재료·찜은 현재 화면에서 동작한다", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("blocked", "SecurityError"); };
    Storage.prototype.getItem = () => { throw new DOMException("blocked", "SecurityError"); };
  });
  await page.goto("/");
  const like = page.getByRole("button", { name: "버터 가래떡구이 찜하기", exact: true });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  const region = page.getByRole("region", { name: "보유 재료로 찾기" });
  await region.getByRole("checkbox", { name: "보유 재료로 찾기", exact: true }).check();
  const ingredient = region.getByRole("checkbox", { name: "무염 버터", exact: true });
  await ingredient.check();
  await expect(ingredient).toBeChecked();
});

test("만드는 법은 요리 모드 없이 조리 시간만 표시한다", async ({ page }, info) => {
  await page.goto("/food/butter-garaetteok");
  const recipe = page.locator("#recipe");
  await expect(recipe.getByRole("heading", { name: "만드는 법" })).toBeVisible();
  await expect(recipe.getByRole("button")).toHaveCount(0);
  const duration = recipe.getByText("1분", { exact: true });
  await expect(duration).toBeVisible();
  await duration.click();
  await expect(duration).toHaveText("1분");
  await expect(recipe.getByRole("timer")).toHaveCount(0);
  await recipe.screenshot({ path: `test-results/recipe-duration-${info.project.name}.png` });
});

test("방문 통계는 허용 전 호출하지 않고 검색어·필터를 보내지 않으며 철회 후 멈춘다", async ({ page }) => {
  let loads = 0;
  await page.route("https://www.googletagmanager.com/**", (route) => { loads++; return route.fulfill({ contentType: "text/javascript", body: "" }); });
  await page.goto("/?q=달걀&tag=자취생");
  expect(loads).toBe(0);
  await page.getByRole("button", { name: "통계 허용", exact: true }).click();
  await expect.poll(() => loads).toBe(1);
  await page.getByRole("searchbox", { name: "음식 이름이나 재료로 검색" }).fill("비밀검색어");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const events = () => page.evaluate(() => (window.dataLayer ?? []) as unknown[][]);
  await expect.poll(async () => (await events()).some((row) => row[1] === "search")).toBe(true);
  const payload = JSON.stringify(await events());
  expect(payload).not.toContain("비밀검색어");
  expect(payload).not.toContain("?q=");
  await page.locator("summary").filter({ hasText: "방문 통계 설정" }).click();
  await page.getByRole("button", { name: "허용하지 않기", exact: true }).click();
  const count = (await events()).length;
  await page.getByRole("searchbox", { name: "음식 이름이나 재료로 검색" }).fill("다른검색");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  expect((await events()).length).toBe(count);
});

test("정적 SEO: 사이트맵·크롤링 규칙·canonical·Recipe가 실제 음식과 일치한다", async ({ page, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: async ({ url }: ShareData) => { document.body.dataset.sharedUrl = url; },
    });
  });
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("https://vviralfood.com/food/butter-garaetteok");
  expect(await sitemap.text()).not.toContain("/admin");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap: https://vviralfood.com/sitemap.xml");
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://vviralfood.com/brand/vviralfood-logo-528.png");
  await page.goto("/food/butter-garaetteok");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://vviralfood.com/food/butter-garaetteok");
  await page.getByRole("button", { name: "공유하기", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-shared-url", "https://vviralfood.com/food/butter-garaetteok");
  const recipe = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(recipe["@type"]).toBe("Recipe");
  expect(recipe.name).toBe(await page.getByRole("heading", { level: 1 }).innerText());
  expect(recipe.recipeInstructions.length).toBe(await page.locator("#recipe ol > li").count());
  expect(recipe.aggregateRating).toBeUndefined();
});

test("동의한 음식 선택·찜·구매 클릭은 각각 한 번 집계하고 관리자에서는 분석하지 않는다", async ({ page, context }) => {
  await context.route(/https?:\/\/(?:[^/]+\.)?coupang\.com\//, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>구매 테스트</title>" }));
  await page.goto("/");
  await page.getByRole("button", { name: "통계 허용", exact: true }).click();
  await page.getByRole("button", { name: "버터 가래떡구이 찜하기", exact: true }).click();
  await page.getByRole("heading", { name: "버터 가래떡구이", exact: true }).getByRole("link").click();
  await expect(page).toHaveURL(/\/food\/butter-garaetteok/);
  const popup = page.waitForEvent("popup");
  await page.locator("#cart").getByRole("link", { name: /쿠팡에서 .+ 보기/ }).click();
  await (await popup).close();
  const events = await page.evaluate(() => (window.dataLayer ?? []) as unknown[][]);
  for (const name of ["select_content", "food_like", "purchase_click"]) expect(events.filter((row) => row[0] === "event" && row[1] === name), name).toHaveLength(1);
  await page.goto("/admin");
  await expect(page.locator("#tf-ga")).toHaveCount(0);
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
});
