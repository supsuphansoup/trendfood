import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const PASSWORD = "test-admin-password"; // playwright.config.ts 의 webServer.env
const cardTitles = (page: Page) => page.locator("#list li h3").allInnerTexts();

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function noA11y(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
}

test("관리자 화면은 숨겨져 있고 로그인해야 들어갈 수 있다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0); // 공개 화면에 링크 없음

  const res = await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // 로그인 없이 다른 관리자 주소도 막힘
  await page.goto("/admin/queue");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.getByLabel("비밀번호").fill("wrong-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.locator("#login-error")).toHaveText("비밀번호가 맞지 않아요.");
  await noA11y(page);

  await login(page);
  await expect(page.getByRole("heading", { name: "게시 관리" })).toBeVisible();
  await noA11y(page);
});

test("숨기기·순서 바꾸기가 공개 화면에 바로 반영된다", async ({ page }) => {
  await login(page);

  await page.locator("li", { hasText: "참치 김밥" }).getByRole("button", { name: "숨기기" }).click();
  await expect(page.locator("li", { hasText: "참치 김밥" }).getByRole("button", { name: "다시 공개" })).toBeVisible();
  await page.goto("/");
  expect(await cardTitles(page)).not.toContain("참치 김밥");
  expect(await cardTitles(page)).toHaveLength(8);

  await page.goto("/admin");
  await page.getByRole("button", { name: "치킨마요 덮밥 아래로" }).click();
  await expect(page.locator("ol > li").nth(2)).toContainText("치킨마요 덮밥");
  await page.goto("/");
  expect((await cardTitles(page)).slice(0, 2)).toEqual(["새우 로제 떡볶이", "치킨마요 덮밥"]);

  // 원래대로
  await page.goto("/admin");
  await page.getByRole("button", { name: "치킨마요 덮밥 위로" }).click();
  await expect(page.locator("ol > li").nth(1)).toContainText("치킨마요 덮밥");
  await page.locator("li", { hasText: "참치 김밥" }).getByRole("button", { name: "다시 공개" }).click();
  await expect(page.locator("li", { hasText: "참치 김밥" }).getByRole("button", { name: "숨기기" })).toBeVisible();
});

test("글 고치기가 저장된다", async ({ page }) => {
  await login(page);
  const item = page.locator("li", { hasText: "계란 파 라면" });
  await item.getByText("글 고치기").click();
  await item.getByLabel("카드 설명 (한두 문장)").fill("계란은 마지막에, 파는 듬뿍. 검수 완료.");
  await item.getByRole("button", { name: "저장" }).click();
  await expect(item.getByRole("status")).toHaveText(/저장했어요/);
  await page.goto("/");
  await expect(page.getByText("계란은 마지막에, 파는 듬뿍. 검수 완료.")).toBeVisible();
});

test("재료 링크를 등록하면 장바구니가 그 링크를 연다", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "재료 링크" }).first().click();
  await expect(page).toHaveURL(/\/admin\/links/);
  await expect(page.getByRole("heading", { name: "재료 링크" })).toBeVisible();
  await noA11y(page);

  const url = page.getByLabel("피스타치오 스프레드 200g");
  await url.fill("http://evil.example.com/x");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText(/https/);

  await url.fill("https://link.coupang.com/a/test123");
  await page.getByLabel("참고 가격(원)").first().fill("11,900");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("재료 링크를 저장했어요.");

  await page.goto("/food/dubai-chocolate");
  const cta = page.locator("#cart").getByRole("link", { name: /장보기 시작: 피스타치오 스프레드/ });
  await expect(cta).toHaveAttribute("href", "https://link.coupang.com/a/test123");
  await expect(page.locator("#cart").getByText("11,900원")).toBeVisible();
});

test("후보 큐에 추가하고 승인한다, 로그아웃하면 다시 막힌다", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "후보 큐" }).click();
  await expect(page.getByRole("heading", { name: "후보 큐" })).toBeVisible();
  await page.getByRole("textbox", { name: "음식 이름" }).fill("탕후루");
  await page.getByRole("combobox", { name: "종류" }).selectOption("디저트");
  await page.getByRole("textbox", { name: "근거 메모" }).fill("영상 20개");
  await page.getByRole("button", { name: "후보 추가" }).click();
  await expect(page.getByRole("status")).toHaveText(/탕후루/);
  const row = page.locator("li", { hasText: "탕후루" });
  await expect(row).toContainText("대기");
  await row.getByRole("button", { name: "탕후루 승인" }).click();
  await expect(row.locator("span", { hasText: "승인" }).first()).toBeVisible();
  await noA11y(page);

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
