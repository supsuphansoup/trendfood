import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

const rgb = (el: Locator) =>
  el.evaluate((node) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = getComputedStyle(node).color;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });
const near = (actual: number[], hex: string) =>
  actual.every((v, i) => Math.abs(v - parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)) <= 2);

const cardTitles = (page: Page) => page.locator("#list li h3").allInnerTexts();

async function expectNoA11yViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
}

test("메인: 1위 히어로, 2~10위 목록, 테마, 접근성", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("두바이 초콜릿");
  expect(await cardTitles(page)).toHaveLength(9);
  await expect(page.getByLabel("광고")).toHaveCount(1);

  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^"?Pretendard Variable/);
  expect(near(await rgb(page.locator("body")), "#2A1D16")).toBe(true);
  expect(near(await rgb(page.locator("#list li span.text-accent").first()), "#B3301B")).toBe(true);

  await expectNoA11yViolations(page);
  for (const img of await page.locator("#list img").all()) await img.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `test-results/home-${info.project.name}.png`, fullPage: true });
});

test("메인: 정렬·태그·검색·찜 필터가 동작한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "좋아요순" }).click();
  expect((await cardTitles(page))[0]).toBe("치킨마요 덮밥");
  await page.getByRole("button", { name: "조리시간순" }).click();
  expect((await cardTitles(page))[0]).toBe("계란 파 라면");

  await page.getByRole("button", { name: "#디저트" }).click();
  expect(await cardTitles(page)).toEqual(expect.arrayContaining(["두바이 초콜릿", "버터 가래떡구이"]));
  await page.getByRole("button", { name: "전체 보기" }).click();

  await page.getByRole("searchbox").fill("새우");
  await page.getByRole("searchbox").press("Enter");
  expect((await cardTitles(page)).sort()).toEqual(["새우 로제 떡볶이", "새우 크림 리조또"]);
  await page.getByRole("button", { name: "전체 보기" }).click();

  await page.getByRole("button", { name: "참치 김밥 찜하기" }).click();
  await expect(page.getByRole("button", { name: "참치 김밥 찜하기" })).toHaveAttribute("aria-pressed", "true");
  await page.locator("header").getByRole("button", { name: "찜 1" }).click();
  expect(await cardTitles(page)).toEqual(["참치 김밥"]);

  await page.reload();
  await expect(page.locator("header").getByRole("button", { name: "찜 1" })).toBeVisible(); // 새로고침해도 유지
});

test("메인: 카테고리 탭, 주소에 필터 기억, 뒤로가기", async ({ page }, info) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "카테고리" }).filter({ visible: true });
  await expect(nav).toHaveCount(1); // PC는 왼쪽, 모바일은 위쪽 탭 하나만 보임
  if (info.project.name === "desktop") {
    expect((await nav.boundingBox())!.x).toBeLessThan(100); // 왼쪽 사이드바
  }

  await nav.getByRole("button", { name: /^면/ }).click();
  await expect(nav.getByRole("button", { name: /^면/ })).toHaveAttribute("aria-current", "true");
  expect((await cardTitles(page)).sort()).toEqual(["계란 파 라면", "들기름 막국수"]);
  await expect(page).toHaveURL(/cat=%EB%A9%B4/);

  await page.getByRole("button", { name: "좋아요순" }).click();
  await expect(page).toHaveURL(/sort=/);
  expect(await cardTitles(page)).toEqual(["들기름 막국수", "계란 파 라면"]);

  await page.reload(); // 새로고침해도 그대로
  await expect(nav.getByRole("button", { name: /^면/ })).toHaveAttribute("aria-current", "true");
  expect(await cardTitles(page)).toEqual(["들기름 막국수", "계란 파 라면"]);

  await page.goBack(); // 정렬 전으로
  await expect(page).not.toHaveURL(/sort=/);
  await expect(nav.getByRole("button", { name: /^면/ })).toHaveAttribute("aria-current", "true");

  // 검색어 지우기 버튼
  await page.getByRole("searchbox").fill("떡");
  await page.getByRole("button", { name: "검색어 지우기" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");

  await page.goto("/?cat=" + encodeURIComponent("디저트"));
  await expect(nav.getByRole("button", { name: /^디저트/ })).toHaveAttribute("aria-current", "true");
  expect(await cardTitles(page)).toEqual(["두바이 초콜릿"]); // 카테고리 기준 (가래떡은 '간식', #디저트 태그만 있음)
  await page.screenshot({ path: `test-results/home-category-${info.project.name}.png` });
});

test("상세: 재료 연속 담기, 집에 있어요 기억, 타이머, 접근성", async ({ page, context }, info) => {
  await page.goto("/");
  await page.getByRole("link", { name: "레시피 보기" }).first().click();
  await expect(page).toHaveURL(/\/food\/dubai-chocolate$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("두바이 초콜릿");
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/detail-${info.project.name}.png`, fullPage: true });

  const cart = page.locator("#cart");
  await expect(cart.getByText("0/4 담음")).toBeVisible();
  await expect(cart.getByText("37,400원")).toBeVisible();

  // 탭 1회 = 쿠팡 상품 1개 (새 창)
  const first = cart.getByRole("link", { name: /장보기 시작: 피스타치오 스프레드/ });
  await expect(first).toHaveAttribute("rel", /sponsored/);
  const [popup] = await Promise.all([context.waitForEvent("page"), first.click()]);
  expect(popup.url()).toContain("coupang.com");
  await popup.close();
  await expect(cart.getByText("1/4 담음")).toBeVisible();
  await expect(cart.getByRole("link", { name: /다음 재료 담기: 카다이프 면/ })).toBeVisible();

  // 체크 해제 → 집에 있어요, 다른 레시피에서도 빠짐
  await cart.getByRole("checkbox", { name: /무염 버터/ }).uncheck();
  await expect(cart.getByText("1/3 담음")).toBeVisible();
  await page.goto("/food/butter-garaetteok");
  await expect(page.getByRole("checkbox", { name: /무염 버터/ })).not.toBeChecked();

  await page.getByRole("button", { name: "타이머 1분" }).click();
  await expect(page.getByRole("timer")).toHaveText(/0:5\d|1:00/);
});

test("없는 음식 주소는 404, 모든 음식 상세는 200", async ({ page }) => {
  const res = await page.goto("/food/none");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "찾는 음식이 없어요" })).toBeVisible();

  await page.goto("/");
  const hrefs = await page.locator('#list a[href^="/food/"]:not([href*="#"])').evaluateAll((as) =>
    as.map((a) => a.getAttribute("href")!),
  );
  for (const href of new Set([...hrefs, "/food/dubai-chocolate"])) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
});
