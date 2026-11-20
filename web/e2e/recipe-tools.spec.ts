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

test("요리 모드: 완료 기억·키보드 닫기·포커스 복원·화면 켜두기 실패 안내", async ({ page }, info) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "wakeLock", { value: { request: async () => { throw new DOMException("denied", "NotAllowedError"); } } }));
  await page.goto("/food/butter-garaetteok");
  const trigger = page.getByRole("button", { name: "요리 모드", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name: "단계 1 완료", exact: true }).check();
  await expect(dialog.getByRole("status").first()).toContainText("1/");
  await dialog.getByRole("checkbox", { name: "화면 켜두기", exact: true }).check();
  await expect(dialog.getByText(/화면 켜두기를 사용할 수 없어요/)).toBeVisible();
  await dialog.getByRole("button", { name: "타이머 1분", exact: true }).click();
  await expect(dialog.getByRole("timer")).toContainText(/1:00|0:5\d/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/cooking-${info.project.name}.png` });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByRole("checkbox", { name: "단계 1 완료", exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: "완료 표시 초기화" }).click();
  await expect(dialog.getByRole("checkbox", { name: "단계 1 완료", exact: true })).not.toBeChecked();
});

test("화면 켜두기는 모드를 닫는 동안 늦게 승인돼도 즉시 해제한다", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { wakeApprove: () => void; wakeReleased: number };
    state.wakeReleased = 0;
    Object.defineProperty(navigator, "wakeLock", { value: { request: () => new Promise((resolve) => { state.wakeApprove = () => resolve({ release: async () => { state.wakeReleased++; }, addEventListener: () => {} }); }) } });
  });
  await page.goto("/food/butter-garaetteok");
  await page.getByRole("button", { name: "요리 모드", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "화면 켜두기", exact: true }).check();
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await page.evaluate(() => (window as unknown as { wakeApprove: () => void }).wakeApprove());
  await expect.poll(() => page.evaluate(() => (window as unknown as { wakeReleased: number }).wakeReleased)).toBe(1);
});

test("타이머는 백그라운드 경과 시간을 반영하고 일시정지 동안 유지된다", async ({ page }) => {
  await page.clock.install();
  await page.goto("/food/butter-garaetteok");
  await page.getByRole("button", { name: "타이머 1분", exact: true }).click();
  await page.clock.fastForward(20_000);
  await expect(page.getByRole("timer")).toHaveText("0:40");
  await page.getByRole("button", { name: "타이머 멈춤" }).click();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole("timer")).toHaveText("0:40");
  await page.getByRole("button", { name: "타이머 계속" }).click();
  await page.clock.fastForward(40_000);
  await expect(page.getByRole("timer")).toHaveText("다 됐어요!");
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
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("https://trendfood.pages.dev/food/butter-garaetteok");
  expect(await sitemap.text()).not.toContain("/admin");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
  await page.goto("/food/butter-garaetteok");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://trendfood.pages.dev/food/butter-garaetteok");
  const recipe = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(recipe["@type"]).toBe("Recipe");
  expect(recipe.name).toBe(await page.getByRole("heading", { level: 1 }).innerText());
  expect(recipe.recipeInstructions.length).toBe(await page.locator("#recipe ol > li").count());
  expect(recipe.aggregateRating).toBeUndefined();
});
