import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // 기존 상세 이동 테스트도 실제 YouTube 네트워크에 의존하지 않는다.
  await page.route(/^https?:\/\/(?:[^/]+\.)?youtube(?:-nocookie)?\.com\//, (route) => route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="ko"><head><title>영상 테스트</title></head><body></body></html>' }));
});

const rgb = (el: Locator) =>
  el.evaluate((node) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = getComputedStyle(node).color;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });
const near = (actual: number[], hex: string) =>
  actual.every((v, i) => Math.abs(v - parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)) <= 2);

const cardTitles = (page: Page) => page.locator("#list li").getByRole("heading").allInnerTexts();

test("첨부 로고: 공개 페이지의 이미지·홈 이동·탭 아이콘이 동일하다", async ({ page, request }, info) => {
  const asset = await request.get("/brand/vviralfood-logo.png");
  expect(asset.ok()).toBe(true);
  expect(asset.headers()["content-type"]).toBe("image/png");
  for (const path of ["/", "/food/dubai-chocolate", "/about", "/privacy", "/terms"]) {
    await page.goto(path);
    const logo = page.getByTestId("site-logo");
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", "/brand/vviralfood-logo.png");
    await expect(logo).toHaveAttribute("alt", "vviralfood");
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(2172);
    await expect(logo).toHaveCSS("object-fit", "contain");
    const logoBox = (await logo.boundingBox())!;
    expect(logoBox.width / logoBox.height).toBeCloseTo(3, 2);
    const link = logo.locator("..");
    await expect(link).toHaveAttribute("href", "/");
    await expect(link).toHaveAccessibleName("vviralfood");
    const bounds = (await link.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    if (path === "/") {
      const title = page.getByRole("heading", { name: "유행 음식과 집밥" });
      expect(bounds.x).toBeCloseTo((await title.boundingBox())!.x, 0);
    }
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/brand/vviralfood-logo.png");
    await expect(page).toHaveTitle(path === "/" ? "vviralfood — 지금 뜨는 음식" : / \| vviralfood$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (path === "/food/dubai-chocolate") await page.screenshot({ path: `test-results/logo-detail-${info.project.name}.png` });
  }
  await page.getByRole("main").getByRole("link", { name: "vviralfood", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.screenshot({ path: `test-results/logo-home-${info.project.name}.png` });
});

const siteInfoLinks = [
  ["사이트 소개", "/about"],
  ["개인정보처리방침", "/privacy"],
  ["이용약관", "/terms"],
  ["삭제 요청·연락처", "/about#contact"],
] as const;

test("올린 사진 상세: 로컬 사진 로딩·출처 링크·axe·가로 넘침", async ({ page }, info) => {
  await page.goto("/food/tuna-gimbap");
  const image = page.getByRole("region", { name: "음식 소개", exact: true }).getByRole("img");
  await expect(image).toHaveAttribute("src", "/photos/00000000-0000-4000-8000-000000000001.webp");
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  const credit = page.getByText("사진: 테스트 사진 작가 · CC BY", { exact: true });
  await expect(credit).toBeVisible();
  const link = credit.getByRole("link", { name: "테스트 사진 작가", exact: true });
  await expect(link).toHaveAttribute("href", "https://example.com/test-photo");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  expect(await page.locator("img").evaluateAll((images: HTMLImageElement[]) => images.every((img) => !img.src.includes("supabase")))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/photo-credit-${info.project.name}.png`, fullPage: true });
  // 긴 출처도 화면 밖으로 나가지 않아야 한다.
  await link.evaluate((node) => { node.textContent = "아주긴사진출처".repeat(50); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("번들 사진 상세: 사진 출처 줄 없음", async ({ page }) => {
  await page.goto("/food/dubai-chocolate");
  await expect(page.getByText(/^사진:/)).toHaveCount(0);
  expect(await page.locator("img").evaluateAll((images: HTMLImageElement[]) => images.every((img) => !img.src.includes("supabase")))).toBe(true);
});

test("올린 사진 메인: 카드 로컬 사진 로딩·Supabase 사진 주소 없음", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("#list li").filter({ has: page.getByRole("heading", { name: "참치 김밥", exact: true }) });
  const image = card.getByRole("img");
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", "/photos/00000000-0000-4000-8000-000000000001.webp");
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(card.getByText(/^사진:/)).toHaveCount(0);
  expect(await page.locator("img").evaluateAll((images: HTMLImageElement[]) => images.every((img) => !img.src.includes("supabase")))).toBe(true);
});

test("원본 영상 상세: 공식 iframe·출처·최소 크기·axe·가로 넘침", async ({ page }, info) => {
  await page.goto("/food/chicken-mayo-deopbap");
  const frame = page.locator("iframe");
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/trendfood01");
  await expect(frame).toHaveAttribute("title", "치킨마요 덮밥 원본 영상");
  await expect(frame).toHaveAttribute("loading", "lazy");
  await expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  await expect(frame).toHaveAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
  await expect(frame).toHaveAttribute("allowfullscreen", "");
  const link = page.getByRole("link", { name: "YouTube에서 보기", exact: true });
  await expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=trendfood01");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText("원본 영상은 YouTube 공식 플레이어로 재생돼요. 원작자가 요청하면 바로 내려요.", { exact: false })).toBeVisible();
  const box = (await frame.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(200);
  expect(box.height).toBeGreaterThanOrEqual(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/detail-video-${info.project.name}.png`, fullPage: true });
});

test("원본 영상 없음: iframe·임시 문구·관련 영상 수 숨김, 글 폭 제한", async ({ page }) => {
  await page.goto("/food/dubai-chocolate");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText(/원본 영상 자리|관련 영상/)).toHaveCount(0);
  const summary = page.getByRole("heading", { name: "왜 지금 뜨고 있나요", exact: true }).locator("..");
  expect((await summary.boundingBox())!.width).toBeLessThanOrEqual(768);
});

test("원본 영상 개인정보 안내: 제목·Google 방침 링크", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "4. 쿠팡 링크와 YouTube 영상", exact: true })).toBeVisible();
  const link = page.locator("section").filter({ has: page.getByRole("heading", { name: "4. 쿠팡 링크와 YouTube 영상", exact: true }) }).getByRole("link", { name: "Google 개인정보처리방침", exact: true });
  await expect(link).toHaveAttribute("href", "https://policies.google.com/privacy");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("상세: 재료·만드는 법을 소개보다 먼저 보여주고 사서 맛보기는 표시하지 않는다", async ({ page }) => {
  for (const slug of ["egg-green-onion-ramyeon", "dubai-chocolate"]) {
    await page.goto(`/food/${slug}`);
    await expect(page.getByRole("heading", { name: "편의점·마트에서 사서 맛보기", exact: true })).toHaveCount(0);
    if (slug === "egg-green-onion-ramyeon") {
      await expect(page.locator("#cart, #recipe")).toHaveCount(0);
      continue;
    }
    const headings = page.getByRole("main").getByRole("heading", { level: 2 });
    await expect(headings.nth(0)).toHaveText("재료 장바구니");
    await expect(headings.nth(1)).toHaveText("만드는 법");
    await expect(headings.nth(2)).toHaveText("왜 지금 뜨고 있나요");
    const cart = (await page.locator("#cart").boundingBox())!;
    const recipe = (await page.locator("#recipe").boundingBox())!;
    const introduction = (await headings.nth(2).boundingBox())!;
    expect(introduction.y).toBeGreaterThan(Math.max(cart.y + cart.height, recipe.y + recipe.height));
  }
});

test("필수 페이지: 본문·시행일·메일·접근성·가로 넘침", async ({ page }, info) => {
  for (const [title, href] of siteInfoLinks.slice(0, 3)) {
    expect((await page.goto(href))?.status()).toBe(200);
    await expect(page).toHaveTitle(`${title} | vviralfood`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    if (href !== "/about") {
      await expect(page.getByText(`시행일: ${href === "/privacy" ? "2026년 11월 20일" : "2026년 11월 10일"}`, { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2 })).toHaveCount(11);
    }
    const emailLinks = page.getByRole("link", { name: "trendfood2026@gmail.com", exact: true });
    expect(await emailLinks.count()).toBeGreaterThan(0);
    for (const email of await emailLinks.all()) {
      await expect(email).toBeVisible();
      await expect(email).toHaveAttribute("href", "mailto:trendfood2026@gmail.com");
    }
    const footer = page.getByRole("navigation", { name: "사이트 정보", exact: true });
    for (const [label, destination] of siteInfoLinks) {
      await expect(footer.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", destination);
    }
    await expect(page.getByText(/오픈 전 정식 문서로 바꿀 예정|주소 확정 전/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await page.getByRole("main").boundingBox())!.width).toBeLessThanOrEqual(760);
    for (const link of await page.getByRole("link").all()) {
      const box = (await link.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expectNoA11yViolations(page);
    await page.screenshot({ path: `test-results/${href.slice(1)}-${info.project.name}.png`, fullPage: true });
  }
});

test("필수 페이지: 푸터 이동·기존 소개 앵커·전문 보기", async ({ page }) => {
  for (const [label, href] of siteInfoLinks) {
    await page.goto("/about");
    await page.getByRole("navigation", { name: "사이트 정보", exact: true }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(href);
  }
  for (const id of ["about", "partners", "ai", "privacy", "terms", "contact"]) {
    await page.goto(`/about#${id}`);
    await expect(page.locator(`section#${id}`)).toBeVisible();
    if (id === "privacy" || id === "terms") {
      const title = id === "privacy" ? "개인정보처리방침" : "이용약관";
      const fullText = page.locator(`section#${id}`).getByRole("link", { name: `${title} 전문 보기`, exact: true });
      await expect(fullText).toHaveAttribute("href", `/${id}`);
      await fullText.click();
      await expect(page).toHaveURL(`/${id}`);
    }
  }
  await expect(page.locator("#contact").getByRole("listitem")).toHaveText([
    "문제가 되는 페이지 주소",
    "어떤 부분이 문제인지 (원본 주소가 있으면 함께)",
    "본인이 원작자·권리자인지, 대리인인지",
  ]);
  await page.getByRole("main").getByRole("link", { name: "vviralfood", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("연도별 음식: 2010~2025 슬라이더, 출처, 주소 유지와 초기화", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const categories = page.getByRole("navigation", { name: "카테고리" }).filter({ visible: true });
  const filters = page.getByRole("complementary", { name: "음식 필터" });
  const slider = filters.getByRole("slider", { name: "유행 연도", exact: true });
  await expect(slider).toHaveAttribute("min", "2010");
  await expect(slider).toHaveAttribute("max", "2025");
  await filters.getByRole("button", { name: "2025년 음식 보기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2025년 유행 음식", exact: true })).toBeVisible();
  await expect(page.locator("#list").getByRole("heading", { name: "말차 음료·디저트", exact: true })).toBeVisible();
  await slider.focus();
  await slider.press("Home");
  await expect(slider).toHaveValue("2010");
  await expect(page.locator("#list").getByRole("heading", { name: "막걸리", exact: true })).toBeVisible();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("2011");
  await expect(page.locator("#list").getByRole("heading", { name: "꼬꼬면·나가사끼 짬뽕", exact: true })).toBeVisible();
  await slider.press("End");
  await slider.press("ArrowLeft");
  await expect(page).toHaveURL(/year=2024/);
  await page.reload();
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(slider).toHaveValue("2024");
  await expect(page.getByRole("heading", { name: "2024년 유행 음식", exact: true })).toBeVisible();
  await expect(page.locator("#list").getByRole("link", { name: /출처:/ })).toHaveAttribute("href", "https://www.kmib.co.kr/article/view.asp?arcid=0020305303");
  await expectNoA11yViolations(page);
  await categories.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/year-filter-${info.project.name}.png` });
  await page.locator("#list").getByRole("link", { name: "레시피 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/food\/dubai-chocolate$/);
  await page.goto("/?year=2024");
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await categories.getByRole("button", { name: /^면/ }).click();
  await expect(page).not.toHaveURL(/year=/);
  expect((await cardTitles(page)).sort()).toEqual(["계란 파 라면", "들기름 막국수"]);
  await page.goto("/?year=2009");
  await expect(page.getByRole("heading", { name: "2위부터", exact: true })).toBeVisible();
});

test("통합 장바구니를 제거하고 찜·상세 재료 체크·구매 링크는 유지한다", async ({ page }, info) => {
  // 예전에 모은 재료가 브라우저에 남아 있어도 제거한 UI가 다시 나타나지 않는다.
  await page.addInitScript(() => localStorage.setItem("tf:shopping-cart", JSON.stringify([
    JSON.stringify({ slug: "dubai-chocolate", food: "두바이 초콜릿", name: "피스타치오 스프레드" }),
  ])));
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "바로가기" });
  await expect(shortcuts.getByRole("button", { name: "찜 0", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^장바구니/ })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "통합 장바구니" })).toHaveCount(0);
  await page.screenshot({ path: `test-results/no-cart-home-${info.project.name}.png` });
  await page.goto("/food/dubai-chocolate");
  await expect(page.getByRole("button", { name: /^장바구니/ })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "통합 장바구니" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "선택한 재료 통합 장바구니에 담기", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "두바이 초콜릿 찜하기", exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/no-cart-detail-${info.project.name}.png` });
  const ingredients = page.getByRole("region", { name: "재료 장바구니", exact: true });
  await expect(ingredients.getByRole("checkbox")).toHaveCount(6);
  const butter = ingredients.getByRole("checkbox", { name: /무염 버터/ });
  await butter.uncheck();
  await expect(butter).not.toBeChecked();
  await expect(ingredients.getByRole("link", { name: /장보기 시작: 피스타치오 스프레드/ })).toHaveAttribute("href", /coupang\.com/);
  await expect(ingredients.getByRole("button", { name: "재료 목록 복사", exact: true })).toBeVisible();
  await ingredients.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/no-cart-ingredients-${info.project.name}.png` });
});

test("쿠팡 이동은 본문·모바일 하단에서 누른 재료 순서를 지킨다", async ({ page, context }, info) => {
  await context.route("https://www.coupang.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>상품 링크 테스트</p>" }));
  const names = ["피스타치오 스프레드", "카다이프 면", "다크 초콜릿 커버춰", "무염 버터"];
  for (const surface of info.project.name === "mobile" ? ["본문", "하단"] : ["본문"]) {
    await page.goto("/food/dubai-chocolate");
    await page.evaluate(() => localStorage.removeItem("tf:added:dubai-chocolate"));
    await page.reload();
    const cart = page.getByRole("region", { name: "재료 장바구니" });
    for (const [index, name] of names.entries()) {
      const link = surface === "본문"
        ? cart.getByRole("link", { name: new RegExp(`${index === 0 ? "장보기 시작" : "다음 재료 담기"}: ${name}`) })
        : page.getByRole("link", { name: new RegExp(`다음: ${name} 담기`) });
      await expect(link).toBeVisible();
      const href = await link.getAttribute("href");
      expect(new URL(href!).searchParams.get("q")).toBe(name);
      const [popup] = await Promise.all([context.waitForEvent("page"), link.click()]);
      await expect(popup).toHaveURL(href!);
      expect(context.pages()).toHaveLength(2);
      await popup.close();
      await expect(cart.getByText(`${index + 1}/4 담음`, { exact: true })).toBeVisible();
    }
    await expect(cart.getByText("재료를 모두 담았어요", { exact: true })).toBeVisible();
  }
});

async function expectNoA11yViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
}

test("메인: 1위 히어로, 2~10위 목록, 테마, 접근성", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("region", { name: "오늘의 1위", exact: true }).getByRole("heading", { level: 2 })).toHaveText("두바이 초콜릿");
  expect(await cardTitles(page)).toHaveLength(9);
  await expect(page.getByLabel("광고")).toHaveCount(1);

  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^"?Pretendard Variable/);
  expect(near(await rgb(page.locator("body")), "#252525")).toBe(true);
  expect(near(await rgb(page.locator("#list li span.text-accent").first()), "#C93135")).toBe(true);

  await expectNoA11yViolations(page);
  for (const img of await page.locator("#list img").all()) await img.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `test-results/home-${info.project.name}.png`, fullPage: true });
});

test("음식 소개는 조리법·재료 구매 없이 탐색하고 출처와 찜을 제공한다", async ({ page }, info) => {
  await page.goto("/?q=계란 파 라면");
  const card = page.locator("#list li").filter({ has: page.getByRole("heading", { name: "계란 파 라면", exact: true }) });
  await expect(card.getByText("음식 소개", { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: /재료|레시피/ })).toHaveCount(0);
  await card.getByRole("button", { name: /찜/ }).click();
  await page.screenshot({ path: `test-results/discovery-card-${info.project.name}.png`, fullPage: true });
  await card.getByRole("link", { name: "음식 살펴보기" }).click();
  await expect(page).toHaveTitle("계란 파 라면 음식 정보와 출처 | vviralfood");
  await expect(page.getByRole("heading", { name: "어떤 음식인가요" })).toBeVisible();
  await expect(page.getByRole("region", { name: "참고한 출처" })).toBeVisible();
  await expect(page.locator("#cart, #recipe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /재료 살펴보기|만드는 법/ })).toHaveCount(0);
  await expect(page.getByText(/난이도|0분/)).toHaveCount(0);
  await page.getByRole("link", { name: "소개 출처 보기" }).click();
  await expect(page).toHaveURL(/#sources$/);
  await expect(page.getByRole("link", { name: /음식 소개 테스트 출처/ })).toHaveAttribute("href", "https://example.com/food");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/discovery-detail-${info.project.name}.png`, fullPage: true });
});

test("개편 화면: 검색 버튼·탐색 이동·반응형 목록·상세 바로가기", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // 플랫폼별 입력칸의 기본 너비 차이가 검색창을 화면 밖으로 밀지 않게 한다.
  await page.getByRole("searchbox").evaluate((el: HTMLInputElement) => { el.size = 40; });
  const searchForm = page.getByRole("search");
  const homeLink = page.getByRole("link", { name: "vviralfood", exact: true });
  const form = (await searchForm.boundingBox())!;
  const logo = (await homeLink.boundingBox())!;
  const shortcuts = (await page.getByRole("navigation", { name: "바로가기" }).boundingBox())!;
  expect(form.x + form.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(form.x).toBeGreaterThan(logo.x + logo.width);
  expect(form.y + form.height / 2).toBeCloseTo(logo.y + logo.height / 2, 0);
  expect(shortcuts.x - (form.x + form.width)).toBeGreaterThanOrEqual(8);
  expect(shortcuts.x - (form.x + form.width)).toBeLessThanOrEqual(12);
  if (info.project.name === "desktop") {
    expect(form.width).toBeCloseTo(272, 0);
  } else {
    expect(form.width).toBeGreaterThan(150);
    expect(form.width).toBeLessThan(200);
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 360, height: 640 });
    const compactForm = (await searchForm.boundingBox())!;
    const compactLogo = (await homeLink.boundingBox())!;
    expect(compactForm.y).toBeGreaterThan(compactLogo.y + compactLogo.height);
    expect(compactForm.x).toBeCloseTo(compactLogo.x, 0);
    expect(compactForm.x * 2 + compactForm.width).toBeCloseTo(360, 0);
    await page.setViewportSize(viewport);
  }
  const search = page.getByRole("button", { name: "검색", exact: true });
  const searchBox = (await search.boundingBox())!;
  expect(searchBox.width).toBeGreaterThanOrEqual(44);
  expect(searchBox.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `test-results/home-search-${info.project.name}.png` });
  await page.getByRole("searchbox").fill("새우");
  await search.click();
  expect((await cardTitles(page)).sort()).toEqual(["새우 로제 떡볶이", "새우 크림 리조또"]);
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  await expect(page).toHaveURL(/#list$/);
  await expect(page.locator("#list h2")).toBeInViewport();
  const cards = page.locator(".food-grid > li").filter({ has: page.getByRole("heading", { level: 3 }) });
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  expect(Math.abs(first.y - second.y)).toBeLessThan(2);
  expect(second.x).toBeGreaterThan(first.x + first.width);
  const third = (await cards.nth(2).boundingBox())!;
  expect(third.y).toBeGreaterThanOrEqual(first.y + first.height);
  expect(third.width).toBeCloseTo(first.width, 0);
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    overflow: [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > innerWidth).map((el) => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })),
  }));
  expect(layout.width, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
  await page.screenshot({ path: `test-results/redesign-feed-${info.project.name}.png` });
  await page.goto("/food/dubai-chocolate");
  await page.getByRole("link", { name: "만드는 법", exact: true }).click();
  await expect(page).toHaveURL(/#recipe$/);
  await expect(page.getByRole("heading", { name: "만드는 법", exact: true })).toBeInViewport();
  await page.getByRole("link", { name: "재료 살펴보기", exact: true }).click();
  await expect(page).toHaveURL(/#cart$/);
  await expect(page.getByRole("region", { name: "재료 장바구니", exact: true })).toBeInViewport();
  await page.goto("/");
  await page.screenshot({ path: `test-results/redesign-home-${info.project.name}.png` });
});

test("첫 화면: 서비스 소개와 탐색 버튼이 보이고 대표 음식 상세에 연결된다", async ({ page }, info) => {
  await page.goto("/");
  const intro = page.getByRole("main").getByRole("heading", { level: 1 });
  await expect(intro).toHaveText("유행 음식과 집밥");
  await expect(intro).toBeInViewport({ ratio: 1 });
  await expect(intro).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByText("왜 유행했는지, 집에서 만드는 법까지.")).toBeInViewport({ ratio: 1 });
  const browse = page.getByRole("link", { name: "음식 목록", exact: true });
  await expect(browse).toBeInViewport({ ratio: 1 });
  await expect(browse).toHaveCSS("color", "rgb(255, 255, 255)");
  expect((await browse.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const feature = page.getByRole("region", { name: "오늘의 1위", exact: true });
  const featureBox = (await feature.boundingBox())!;
  const photo = feature.getByRole("img");
  await expect(photo).toBeInViewport();
  await expect(photo).toHaveCSS("object-fit", "cover");
  await expect(photo).toHaveCSS("object-position", "50% 50%");
  await expect(feature.locator("figure img")).toHaveCount(1);
  await expect(feature.locator("figcaption")).toHaveCount(0);
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const imageBox = (await photo.boundingBox())!;
  const introBox = (await intro.boundingBox())!;
  await expect(page.getByRole("navigation", { name: "추천 음식 넘기기" }).getByRole("button")).toHaveCount(3);
  expect(imageBox.x).toBe(0);
  expect(imageBox.width).toBe(page.viewportSize()!.width);
  expect(Math.abs(imageBox.y + imageBox.height - page.viewportSize()!.height)).toBeLessThan(12);
  expect(imageBox.y).toBeLessThan(introBox.y);
  const title = feature.getByRole("heading", { level: 2, name: "두바이 초콜릿" });
  await expect(title).toBeVisible();
  const titleBox = (await title.boundingBox())!;
  expect(titleBox.y).toBeGreaterThan(introBox.y + introBox.height);
  expect(titleBox.y).toBeLessThan(imageBox.y + imageBox.height);
  await expect(page.getByRole("navigation", { name: "카테고리" }).getByRole("button", { name: /^전체/ })).toHaveCSS("border-bottom-color", "rgb(201, 49, 53)");
  await expect(page.getByRole("navigation", { name: "카테고리" })).toBeVisible();
  await expect(page.locator("#food-filters")).toBeHidden();
  const cta = feature.getByRole("link", { name: "음식 살펴보기", exact: true });
  await expect(cta).toBeVisible();
  expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(cta).toHaveAttribute("href", "/food/dubai-chocolate");
  await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const featureDescription = feature.getByTestId("feature-description");
  await expect(featureDescription).toHaveCSS("font-size", info.project.name === "desktop" ? "20px" : "16px");
  const descriptionBox = (await featureDescription.boundingBox())!;
  expect(descriptionBox.y).toBeGreaterThan(titleBox.y + titleBox.height);
  expect((await cta.boundingBox())!.y).toBeGreaterThan(descriptionBox.y + descriptionBox.height);
  const notes = page.getByLabel("추천과 출처 안내");
  await expect(notes).toHaveCSS("font-size", "14px");
  // 주목할 음식과 출처·추천 정보의 영역이 겹치지 않아야 한다.
  expect((await notes.boundingBox())!.y).toBeGreaterThanOrEqual(featureBox.y + featureBox.height);
  await page.screenshot({ path: `test-results/intro-home-${info.project.name}.png` });
  await cta.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("두바이 초콜릿");
  await page.goto("/");
  await browse.press("Enter");
  await expect(page).toHaveURL(/#list$/);
  await expect(page.locator("#list")).toBeFocused();
  const firstCard = page.locator(".food-grid > li").first();
  // 홈은 음식 탐색에 집중하고 조리법·구매는 상세에서 이어진다.
  const explore = firstCard.getByRole("link", { name: "음식 살펴보기", exact: true });
  await expect(explore).toHaveCSS("font-size", info.project.name === "desktop" ? "16px" : "14px");
  await expect(firstCard.getByRole("link", { name: /재료.*담기|레시피 보기/ })).toHaveCount(0);
  const description = firstCard.getByTestId("food-description");
  await expect(description).toHaveCSS("font-size", info.project.name === "desktop" ? "18px" : "14px");
  expect(await description.evaluate((el) => el.clientHeight <= parseFloat(getComputedStyle(el).lineHeight) * 2 + 1)).toBe(true);
  const actions = firstCard.getByRole("link");
  // 브라우저 좌표를 뺄 때 나타나는 부동소수점 오차만 허용한다.
  for (const link of await actions.all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44 - 0.001);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/readable-feed-${info.project.name}.png` });
  await explore.click();
  await page.getByRole("link", { name: "재료 살펴보기", exact: true }).click();
  await expect(page).toHaveURL(/#cart$/);
  await expect(page.getByRole("region", { name: "재료 장바구니", exact: true })).toBeInViewport();

});

test("추천 음식은 좌우 버튼으로 한 장씩 순환한다", async ({ page }) => {
  await page.goto("/");
  const active = page.locator("#featured-trend-food");
  const firstName = await active.getByRole("heading", { level: 2 }).innerText();
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).click();
  await expect(active).toHaveAttribute("aria-label", "오늘의 2위");
  await page.getByRole("button", { name: "이전 추천 음식", exact: true }).click();
  await expect(active.getByRole("heading", { level: 2 })).toHaveText(firstName);
  await page.getByRole("button", { name: "이전 추천 음식", exact: true }).click();
  await expect(active).toHaveAttribute("aria-label", "오늘의 3위");
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).click();
  await expect(active.getByRole("heading", { level: 2 })).toHaveText(firstName);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("추천 음식 사진을 양방향으로 드래그하고 클릭하면 상세로 이동한다", async ({ page }) => {
  await page.goto("/");
  const active = page.locator("#featured-trend-food");
  const photo = active.getByRole("img");
  await photo.scrollIntoViewIfNeeded();
  const { x, y, width, height } = (await photo.boundingBox())!;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  for (const [offset, rank] of [[-80, 2], [80, 1]]) {
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + offset, centerY, { steps: 8 });
    await page.mouse.up();
    await expect(active).toHaveAttribute("aria-label", `오늘의 ${rank}위`);
    await expect.poll(async () => (await photo.boundingBox())!.x).toBeCloseTo(x, 0);
    await expect(page).toHaveURL(/\/$/);
  }
  const href = (await active.getByRole("link", { name: /상세 보기/ }).getAttribute("href"))!;
  await photo.click();
  await expect(page).toHaveURL(href);
});

test("추천 음식 자동 넘김은 커서가 사진 위에 있어도 8초 간격이며 정지·재개를 지원한다", async ({ page }) => {
  const start = new Date("2026-11-26T03:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const active = page.locator("#featured-trend-food");
  const toggle = page.getByRole("button", { name: /^자동 넘김 / });
  await expect(toggle).toHaveAccessibleName("자동 넘김 일시정지");
  await page.mouse.move(265, 300);
  await page.clock.runFor(7999);
  await expect(active).toHaveAttribute("aria-label", "오늘의 1위");
  await page.clock.runFor(1);
  await expect(active).toHaveAttribute("aria-label", "오늘의 2위");
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("자동 넘김 시작");
  await page.mouse.move(1, 1);
  await page.clock.runFor(16000);
  await expect(active).toHaveAttribute("aria-label", "오늘의 2위");
  await toggle.click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(8000);
  await expect(active).toHaveAttribute("aria-label", "오늘의 2위");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(8000);
  await expect(active).toHaveAttribute("aria-label", "오늘의 3위");
  await page.clock.runFor(8000);
  await expect(active).toHaveAttribute("aria-label", "오늘의 1위");
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).focus();
  await expect(toggle).toHaveAccessibleName("자동 넘김 시작");
  await page.clock.runFor(8000);
  await expect(active).toHaveAttribute("aria-label", "오늘의 1위");
});

test("동작 줄이기 설정에서는 첫 음식이 유지되고 수동 전환은 애니메이션 없이 동작한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const active = page.locator("#featured-trend-food");
  await expect(page.getByRole("button", { name: "자동 넘김 시작" })).toBeVisible();
  await page.clock.runFor(16000);
  await expect(active).toHaveAttribute("aria-label", "오늘의 1위");
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).click();
  await expect(active).toHaveAttribute("aria-label", "오늘의 2위");
  await expect(page.locator(".home-hero-track")).toHaveCSS("transition-property", "none");
});

test("모바일에서 가로 스와이프로 추천 음식을 넘긴다", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "모바일 터치 동작");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 310, y: 330 }] });
  for (const x of [275, 225, 170, 105, 65]) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: 330 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("#featured-trend-food")).toHaveAttribute("aria-label", "오늘의 2위");
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("메인: 음식 사진을 누르면 상세로 이동하고 찜은 이동 없이 동작한다", async ({ page }) => {
  await page.goto("/");
  const feature = page.getByRole("region", { name: "오늘의 1위", exact: true });
  const name = await feature.getByRole("heading", { level: 2 }).innerText();
  const featurePhoto = feature.getByRole("link", { name: `${name} 상세 보기`, exact: true });
  const featureHref = await featurePhoto.getAttribute("href");
  await featurePhoto.getByRole("img").click();
  await expect(page).toHaveURL(featureHref!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await page.goBack();
  const card = page.locator("#list li").filter({ has: page.getByRole("heading", { name: "치킨마요 덮밥", exact: true }) });
  const photoLink = card.getByRole("link", { name: "치킨마요 덮밥 상세 보기", exact: true });
  const href = await photoLink.getAttribute("href");

  await card.getByRole("button", { name: "치킨마요 덮밥 찜하기" }).click();
  await expect(card.getByRole("button", { name: "치킨마요 덮밥 찜하기" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL("/");

  await photoLink.getByRole("img").click();
  await expect(page).toHaveURL(href!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("치킨마요 덮밥");
});

test("메인: 필터 버튼으로 열고 닫으며 선택 조건과 주소를 유지한다", async ({ page }, info) => {
  // 두 번의 axe 검사·키보드 조작·새로고침을 포함한다. 개별 화면 assertion의 5초 제한은 유지한다.
  test.setTimeout(60_000);
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "필터", exact: true });
  const panel = page.locator("#food-filters");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", "food-filters");
  await expect(panel).toBeHidden();
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  const closedWidth = (await page.locator("#list").boundingBox())!.width;
  await page.screenshot({ path: `test-results/filters-closed-${info.project.name}.png` });
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  expect((await page.locator("#list").boundingBox())!.width).toBe(closedWidth);
  await page.getByRole("navigation", { name: "카테고리" }).getByRole("button", { name: /^면/ }).click();
  await panel.getByRole("button", { name: "조리시간순", exact: true }).click();
  await expect(panel.getByRole("button", { name: "조리시간순", exact: true })).toHaveAttribute("aria-pressed", "true");
  const selectedUrl = page.url();
  const selectedTitles = await cardTitles(page);
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/filters-open-${info.project.name}.png`, animations: "disabled" });
  await expectNoA11yViolations(page);
  await toggle.focus();
  await toggle.press("Space");
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(selectedUrl);
  await expect(page.locator("#list li h3")).toHaveText(selectedTitles);
  await expectNoA11yViolations(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(panel).toBeHidden();
  await expect(page.locator("#list li h3")).toHaveText(selectedTitles);
  await toggle.click();
  await expect(page.getByRole("navigation", { name: "카테고리" }).getByRole("button", { name: /^면/ })).toHaveAttribute("aria-current", "true");
  await expect(panel.getByRole("button", { name: "조리시간순", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("메인: 정렬·태그·검색·찜 필터가 동작한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "필터", exact: true }).click();

  await page.getByRole("button", { name: "좋아요순" }).click();
  expect((await cardTitles(page))[0]).toBe("치킨마요 덮밥");
  await page.getByRole("button", { name: "조리시간순" }).click();
  expect((await cardTitles(page)).at(-1)).toBe("계란 파 라면"); // 조리법 없는 소개를 시간 0분으로 정렬하지 않는다.

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
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "카테고리" }).filter({ visible: true });
  await expect(nav).toHaveCount(1); // 같은 가로 카테고리를 PC·모바일에서 사용한다.
  await expect(nav.getByRole("button", { name: /^간식/ })).toHaveCount(0);
  if (info.project.name === "desktop") {
    expect((await nav.boundingBox())!.width).toBeGreaterThan(800);
  }

  await nav.getByRole("button", { name: /^면/ }).click();
  await expect(nav.getByRole("button", { name: /^면/ })).toHaveAttribute("aria-current", "true");
  expect((await cardTitles(page)).sort()).toEqual(["계란 파 라면", "들기름 막국수"]);
  await expect(page).toHaveURL(/cat=%EB%A9%B4/);

  await page.getByRole("button", { name: "좋아요순" }).click();
  await expect(page).toHaveURL(/sort=/);
  expect(await cardTitles(page)).toEqual(["들기름 막국수", "계란 파 라면"]);

  await page.reload(); // 새로고침해도 그대로
  await page.getByRole("button", { name: "필터", exact: true }).click();
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
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(nav.getByRole("button", { name: /^디저트/ })).toHaveAttribute("aria-current", "true");
  expect(await cardTitles(page)).toEqual(["두바이 초콜릿", "에어프라이어 계란빵", "버터 가래떡구이", "대파 크림치즈 베이글"]);
  await page.screenshot({ path: `test-results/home-category-${info.project.name}.png` });
  await page.goto("/?cat=" + encodeURIComponent("간식"));
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(nav.getByRole("button", { name: /^전체/ })).toHaveAttribute("aria-current", "true");
  await expect(page).not.toHaveURL(/cat=/);
  expect(await cardTitles(page)).toContain("버터 가래떡구이");
});

test("일상 레시피 탭: 상단 추천을 유지하고 주소·검색·기본 목록 복귀를 지원한다", async ({ page }, info) => {
  await page.goto("/");
  const original = await cardTitles(page);
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  const everyday = categories.getByRole("button", { name: /^일상 레시피/ });
  const secondPick = page.getByRole("region", { name: "오늘의 2위", exact: true }).getByRole("heading", { level: 2 });
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).click();
  const selectedName = await secondPick.innerText();
  await everyday.focus();
  await everyday.press("Enter");
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(categories.locator('[aria-current="true"]')).toHaveCount(1);
  await expect(page).toHaveURL(/collection=everyday/);
  await expect(page.locator("#list").getByRole("heading", { level: 2, name: "일상 레시피", exact: true })).toBeVisible();
  expect(await cardTitles(page)).toContain("치킨마요 덮밥");
  expect(await cardTitles(page)).not.toContain("계란 파 라면"); // 소개 전용 예시는 제외한다.
  await expect(page.locator("#list").getByText("순위", { exact: true })).toHaveCount(0);
  await expect(secondPick).toHaveText(selectedName);
  await page.reload();
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("region", { name: "오늘의 1위", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).click();
  await page.getByRole("searchbox").fill("치킨마요");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list li").getByRole("heading")).toHaveText(["치킨마요 덮밥"]);
  await page.getByRole("button", { name: "검색어 지우기", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/everyday-tab-${info.project.name}.png` });
  await categories.getByRole("button", { name: /^전체/ }).click();
  await expect(page.locator("#list li h3")).toHaveText(original);
  await expect(secondPick).toHaveText(selectedName);
  await expect(page).not.toHaveURL(/collection=/);
  await page.goBack();
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(secondPick).toHaveText(selectedName);
});

test("상세: 재료 연속 담기, 집에 있어요 기억, 타이머, 접근성", async ({ page, context }, info) => {
  await context.route("https://www.coupang.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>상품 링크 테스트</p>" }));
  await page.goto("/");
  await page.getByRole("link", { name: "음식 살펴보기", exact: true }).first().click();
  await expect(page).toHaveURL(/\/food\/dubai-chocolate$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("두바이 초콜릿");
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/detail-${info.project.name}.png`, fullPage: true });

  const cart = page.getByRole("region", { name: "재료 장바구니" });
  const disclosure = cart.getByText(
    "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",
    { exact: true },
  );
  await expect(disclosure).toBeVisible();
  const disclosureBox = await disclosure.boundingBox();
  const firstCheckboxBox = await cart.getByRole("checkbox").first().boundingBox();
  expect(disclosureBox).not.toBeNull();
  expect(firstCheckboxBox).not.toBeNull();
  expect(disclosureBox!.y).toBeLessThan(firstCheckboxBox!.y);
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
