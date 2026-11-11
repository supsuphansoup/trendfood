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

const cardTitles = (page: Page) => page.locator("#list li h3").allInnerTexts();

const siteInfoLinks = [
  ["사이트 소개", "/about"],
  ["개인정보처리방침", "/privacy"],
  ["이용약관", "/terms"],
  ["삭제 요청·연락처", "/about#contact"],
] as const;

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
  const link = page.getByRole("link", { name: "Google 개인정보처리방침", exact: true });
  await expect(link).toHaveAttribute("href", "https://policies.google.com/privacy");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("상세: 사서 맛보기가 비면 구역을 숨기고 값이 있으면 표시한다", async ({ page }) => {
  await page.goto("/food/egg-green-onion-ramyeon");
  await expect(page.getByRole("heading", { name: "계란 파 라면", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "편의점·마트에서 사서 맛보기", exact: true })).toHaveCount(0);
  await page.goto("/food/dubai-chocolate");
  await expect(page.getByRole("heading", { name: "편의점·마트에서 사서 맛보기", exact: true })).toBeVisible();
});

test("필수 페이지: 본문·시행일·메일·접근성·가로 넘침", async ({ page }, info) => {
  for (const [title, href] of siteInfoLinks.slice(0, 3)) {
    expect((await page.goto(href))?.status()).toBe(200);
    await expect(page).toHaveTitle(`${title} | 트렌드푸드`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    if (href !== "/about") {
      await expect(page.getByText("시행일: 2026년 11월 10일", { exact: true })).toBeVisible();
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
  await page.getByRole("main").getByRole("link", { name: "트렌드푸드", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("연도별 음식: 2010~2025 슬라이더, 출처, 주소 유지와 초기화", async ({ page }, info) => {
  await page.goto("/");
  const categories = page.getByRole("navigation", { name: "카테고리" }).filter({ visible: true });
  const slider = categories.getByRole("slider", { name: "유행 연도", exact: true });
  await expect(slider).toHaveAttribute("min", "2010");
  await expect(slider).toHaveAttribute("max", "2025");
  await categories.getByRole("button", { name: "2025년 음식 보기", exact: true }).click();
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
  await expect(slider).toHaveValue("2024");
  await expect(page.getByRole("heading", { name: "2024년 유행 음식", exact: true })).toBeVisible();
  await expect(page.locator("#list").getByRole("link", { name: /출처:/ })).toHaveAttribute("href", "https://www.kmib.co.kr/article/view.asp?arcid=0020305303");
  await expectNoA11yViolations(page);
  await categories.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/year-filter-${info.project.name}.png` });
  await page.locator("#list").getByRole("link", { name: "레시피 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/food\/dubai-chocolate$/);
  await page.goto("/?year=2024");
  await categories.getByRole("button", { name: /^면/ }).click();
  await expect(page).not.toHaveURL(/year=/);
  expect((await cardTitles(page)).sort()).toEqual(["계란 파 라면", "들기름 막국수"]);
  await page.goto("/?year=2009");
  await expect(page.getByRole("heading", { name: "2위부터", exact: true })).toBeVisible();
});

test("장바구니는 상단 찜 바로 옆에 표시된다", async ({ page }, info) => {
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "바로가기" });
  const likes = shortcuts.getByRole("button", { name: "찜 0", exact: true });
  const cart = shortcuts.getByRole("button", { name: "장바구니 0", exact: true });
  await expect(cart).toBeVisible();
  const likeBox = (await likes.boundingBox())!;
  const cartBox = (await cart.boundingBox())!;
  expect(Math.abs(likeBox.y - cartBox.y)).toBeLessThan(5);
  expect(cartBox.x).toBeGreaterThan(likeBox.x);
  await page.screenshot({ path: `test-results/cart-header-home-${info.project.name}.png` });
  await page.goto("/food/dubai-chocolate");
  await expect(page.locator("header").getByRole("button", { name: "장바구니 0", exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/cart-header-detail-${info.project.name}.png` });
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

test("통합 장바구니: 여러 음식 재료 담기·중복 방지·유지·삭제", async ({ page }, info) => {
  await page.goto("/food/dubai-chocolate");
  const add = () => page.getByRole("button", { name: "선택한 재료 통합 장바구니에 담기", exact: true });
  await add().click();
  await add().click();
  await page.getByRole("button", { name: "장바구니 4", exact: true }).click();
  const cart = page.getByRole("dialog", { name: "통합 장바구니" });
  await expect(cart.getByRole("listitem")).toHaveCount(4);
  await page.getByRole("button", { name: "장바구니 닫기" }).click();
  await page.goto("/food/butter-garaetteok");
  await add().click();
  await page.reload();
  await page.getByRole("button", { name: /^장바구니 \d+$/ }).click();
  await expect(cart.getByRole("link", { name: "두바이 초콜릿", exact: true })).toHaveCount(4);
  await expect(cart.getByRole("link", { name: "버터 가래떡구이", exact: true }).first()).toBeVisible();
  const count = await cart.getByRole("listitem").count();
  await cart.getByRole("button", { name: /삭제$/ }).first().click();
  await expect(cart.getByRole("listitem")).toHaveCount(count - 1);
  await expectNoA11yViolations(page);
  await page.screenshot({ path: `test-results/shopping-cart-${info.project.name}.png` });
  for (let i = count - 1; i > 0; i--) await cart.getByRole("button", { name: /삭제$/ }).first().click();
  await expect(cart.getByText(/장바구니가 비어 있어요/)).toBeVisible();
});

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

test("메인: 음식 사진을 누르면 상세로 이동하고 찜은 이동 없이 동작한다", async ({ page }) => {
  await page.goto("/");
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
