import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "../src/data/content";

const snapshot = JSON.parse(readFileSync(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const automaticPhotos = JSON.parse(readFileSync(new URL("../src/data/content/auto-photo-credits.json", import.meta.url), "utf8")) as Record<string, { licenseUrl: string; license: string; title: string }>;
const generatedImages = JSON.parse(readFileSync(new URL("../src/data/content/generated-images.json", import.meta.url), "utf8")) as Record<string, { note: string }>;

test("수집 콘텐츠: 전체 음식, 큐레이션 표시와 검색", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByText("요즘 눈길 가는 맛.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("궁금했던 유행 음식부터 직접 만들어 볼 레시피까지.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "오늘의 음식", exact: true }).getByRole("link", { name: /^(레시피 보기|음식 알아보기|제품 알아보기)$/ })).toBeInViewport();
  await expect(page.getByRole("region", { name: "함께 둘러볼 음식" }).getByRole("img")).toHaveCount(2);
  for (const image of await page.getByRole("region", { name: "함께 둘러볼 음식" }).getByRole("img").all()) await expect(image).toBeInViewport();
  await page.screenshot({ path: `test-results/content/magazine-home-${info.project.name}.png` });
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(snapshot.foods[0].name);
  if (snapshot.recommendation) {
    await expect(page.getByTestId("recommendation-edition")).toContainText(`추천 갱신 ${snapshot.recommendation.date}`);
    if (snapshot.recommendation.basis === "rotation") {
      await expect(page.getByTestId("recommendation-edition")).toContainText("기존 음식 돌아보기");
      await expect(page.getByText(/새로 추가/)).toHaveCount(0);
    }
  }
  await expect(page.locator("#list li h3")).toHaveCount(snapshot.foods.length - 1);
  await expect(page.getByRole("button", { name: "추천순", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^장바구니/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "좋아요순", exact: true })).toHaveCount(0);
  await expect(page.getByText(new RegExp(`출처 확인 ${snapshot.foods[0].checkedAt ?? snapshot.checkedAt}`))).toBeVisible();
  await expect(page.getByText("오늘 가장 많이 찾은 음식, 1위")).toHaveCount(0);
  await expect(page.getByText(/11위부터/)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/home-${info.project.name}.png` });
  await page.getByRole("link", { name: "음식 둘러보기", exact: true }).click();
  await expect(page.locator("#list h2")).toBeInViewport();
  const cards = page.locator(".food-grid > li").filter({ has: page.getByRole("heading", { level: 3 }) });
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  expect(Math.abs(first.y - second.y)).toBeLessThan(2);
  expect(second.x).toBeGreaterThan(first.x + first.width);
  const third = (await cards.nth(2).boundingBox())!;
  if (info.project.name === "desktop") expect(Math.abs(first.y - third.y)).toBeLessThan(2);
  else expect(third.y).toBeGreaterThanOrEqual(first.y + first.height);
  await expect(cards.first().getByText(generatedImages[snapshot.foods[1].image] ? "AI 생성 예시" : "참고 사진", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/content/feed-${info.project.name}.png` });

  await page.getByRole("searchbox").fill("타피오카");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.ingredients.some((ingredient) => ingredient.name.includes("타피오카")) || food.name.includes("타피오카") || food.why.includes("타피오카")).map((food) => food.name));
});

test("간식 탭 없이 기존 간식 주소는 전체로 열리고 음식 검색을 유지한다", async ({ page }, info) => {
  await page.goto("/?cat=" + encodeURIComponent("간식"));
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  await expect(categories.getByRole("button", { name: /^간식/ })).toHaveCount(0);
  await expect(categories.getByRole("button", { name: /^전체/ })).toHaveAttribute("aria-current", "true");
  await expect(page).not.toHaveURL(/cat=/);
  await expect(page.locator("#list li h3")).toHaveCount(snapshot.foods.length - 1);
  await page.getByRole("link", { name: "음식 둘러보기", exact: true }).click();
  await page.screenshot({ path: `test-results/content/no-snack-tab-${info.project.name}.png` });
  const snack = snapshot.foods.find((food) => food.category === "간식")!;
  await page.getByRole("searchbox").fill(snack.name);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list").getByRole("heading", { name: snack.name, exact: true })).toBeVisible();
});

test("정렬·태그·연도는 카테고리 아래에서 음식 목록을 필터링한다", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const filters = page.getByRole("complementary", { name: "음식 필터" });
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  const sorting = filters.getByRole("navigation", { name: "정렬과 태그", exact: true });
  const years = filters.getByRole("navigation", { name: "유행 연도", exact: true });
  await expect(categories).toHaveCount(1);
  const categoryBox = (await categories.boundingBox())!;
  const sortBox = (await sorting.boundingBox())!;
  const yearBox = (await years.boundingBox())!;
  const listBox = (await page.locator("#list").boundingBox())!;
  expect(sortBox.y).toBeGreaterThanOrEqual(categoryBox.y + categoryBox.height);
  expect(yearBox.y).toBeGreaterThanOrEqual(sortBox.y + sortBox.height);
  expect(yearBox.y + yearBox.height).toBeLessThanOrEqual(listBox.y);
  await page.getByRole("link", { name: "음식 둘러보기", exact: true }).click();
  await filters.getByRole("button", { name: "조리시간순", exact: true }).click();
  await filters.getByRole("button", { name: "#10분컷", exact: true }).click();
  await expect(page).toHaveURL(/sort=/);
  await expect(page).toHaveURL(/tag=10/);
  const expected = snapshot.foods.filter((food) => food.tags.includes("10분컷"))
    .sort((a, b) => (a.kind === "discovery" ? Infinity : a.cookMinutes) - (b.kind === "discovery" ? Infinity : b.cookMinutes));
  await expect(page.locator("#list li h3")).toHaveText(expected.map((food) => food.name));
  await page.screenshot({ path: `test-results/content/sidebar-filters-${info.project.name}.png` });
  await filters.getByRole("button", { name: "#10분컷", exact: true }).click();
  await filters.getByRole("button", { name: "추천순", exact: true }).click();
  await years.getByRole("button", { name: "2024년", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.history?.years.includes(2024)).map((food) => food.name));
  await expect(years.getByRole("button", { name: "2024년", exact: true })).toBeInViewport();
  const selectedUrl = page.url();
  const selectedTitles = await page.locator("#list li h3").allTextContents();
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(filters).toBeHidden();
  await expect(page).toHaveURL(selectedUrl);
  await expect(page.locator("#list li h3")).toHaveText(selectedTitles);
  await page.screenshot({ path: `test-results/content/filters-closed-${info.project.name}.png` });
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(years.getByRole("button", { name: "2024년", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/content/sidebar-years-${info.project.name}.png` });
});

test("2020~2026 연도 필터와 공유 주소·검색 조합·뒤로가기가 일치한다", async ({ page }) => {
  await page.goto("/?year=2020");
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const years = page.getByRole("navigation", { name: "유행 연도" });
  for (const year of [...new Set(snapshot.foods.flatMap((food) => food.history?.years ?? []))].sort()) {
    await years.getByRole("button", { name: `${year}년`, exact: true }).click();
    await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.history?.years.includes(year)).map((food) => food.name));
    await expect(page).toHaveURL(new RegExp(`year=${year}`));
  }
  await page.locator("#list li h3").last().scrollIntoViewIfNeeded();
  await years.getByRole("button", { name: "2020년", exact: true }).click();
  await expect.poll(async () => {
    const heading = await page.locator("#list h2").boundingBox();
    const navigation = await years.boundingBox();
    return heading && navigation ? heading.y >= navigation.y + navigation.height && heading.y >= 0 : false;
  }).toBe(true);
  await page.goto("/?year=2024&q=밤");
  await expect(page.locator("#list li h3")).toHaveText(["밤 티라미수"]);
  await page.reload();
  await expect(page.locator("#list li h3")).toHaveText(["밤 티라미수"]);
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveCount(snapshot.foods.length - 1);
  await page.goBack();
  await expect(page.locator("#list li h3")).toHaveText(["밤 티라미수"]);
});

test("모든 상세에 출처가 있고 레시피에만 사용량·단계를 제공하며 가짜 수치는 없다", async ({ page }, info) => {
  test.setTimeout(Math.max(120_000, snapshot.foods.length * 1000));
  for (const food of snapshot.foods) {
    const response = await page.goto(`/food/${food.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(`${food.name} ${food.kind === "discovery" ? "음식 정보와 출처" : food.kind === "product" ? "제품 정보와 구매 안내" : "레시피와 재료"} | 트렌드푸드`);
    const sources = page.getByRole("region", { name: "참고한 출처" });
    await expect(sources).toBeVisible();
    expect(await sources.getByRole("link").count()).toBeGreaterThan(0);
    for (const link of await sources.getByRole("link").all()) await expect(link).toHaveAttribute("href", /^https:\/\//);
    if (food.kind === "discovery") {
      await expect(page.locator("#cart, #recipe")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "소개 출처 보기" })).toBeVisible();
    } else await expect(page.locator("#cart").getByText(/사용량/).first()).toBeVisible();
    const firstIngredient = food.ingredients.find((ingredient) => !ingredient.pantry);
    if (firstIngredient?.url) {
      const purchase = page.locator("#cart").getByRole("link", { name: `장보기 시작: ${firstIngredient.name}`, exact: true });
      await expect(purchase).toHaveAttribute("href", firstIngredient.url);
      await expect(purchase).toHaveAttribute("rel", /sponsored/);
    }
    if (food.kind !== "discovery") await expect(page.getByRole("heading", { name: food.kind === "product" ? "고르고 즐기는 법" : "만드는 법" })).toBeVisible();
    if (food.history) {
      const history = page.getByRole("region", { name: /주목받은 시기/ });
      await expect(history).toBeVisible();
      expect(await history.getByRole("link").count()).toBeGreaterThan(0);
    } else await expect(page.getByText(food.kind === "discovery" ? /유행 시기 미확정 ·/ : /일상 레시피 ·/)).toBeVisible();
    if (food.image === "pending") {
      const introduction = page.getByRole("region", { name: "음식 소개", exact: true });
      await expect(introduction.locator('img, [role="img"]')).toHaveCount(0);
      await expect(page.getByText(/사진 준비 중/)).toHaveCount(0);
      expect((await introduction.boundingBox())!.height).toBeLessThan(440);
      if (food.slug === "matcha-latte") await page.screenshot({ path: `test-results/content/photo-review-${info.project.name}.png`, fullPage: true });
      if (food.slug === "dubai-chewy-cookie") await page.screenshot({ path: `test-results/content/photo-review-dubai-chewy-cookie-${info.project.name}.png`, fullPage: true });
    } else if (generatedImages[food.image]) {
      const introduction = page.getByRole("region", { name: "음식 소개", exact: true });
      await expect(introduction.getByRole("img", { name: food.alt, exact: true })).toBeVisible();
      await expect(introduction.getByText("AI 생성 예시 · 실제 조리·제품 사진이 아니에요.", { exact: true })).toBeVisible();
      await expect(sources.getByText("AI 생성 예시 이미지", { exact: true })).toBeVisible();
      await expect(sources.getByText(generatedImages[food.image].note, { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /사진 출처|사진 라이선스/ })).toHaveCount(0);
      expect(await introduction.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      if (food.slug === "matcha-latte" || food.slug === "dubai-chewy-cookie") await page.screenshot({ path: `test-results/content/ai-${food.slug}-${info.project.name}.png`, fullPage: true });
    } else {
      await expect(page.getByRole("link", { name: /사진 출처/ })).toBeVisible();
      const introduction = page.getByRole("region", { name: "음식 소개", exact: true });
      const image = introduction.getByRole("img", { name: food.alt, exact: true });
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const portrait = await image.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight < 1.5);
      await expect(image).toHaveCSS("object-fit", portrait ? "contain" : "cover");
      if (portrait) {
        await expect(introduction.getByRole("img")).toHaveCount(1);
        await expect(introduction.locator('img[aria-hidden="true"]')).toHaveCount(1);
        await expect(image).toHaveCSS("object-position", info.project.name === "desktop" ? "100% 50%" : "50% 50%");
      }
      await expect(page.getByText("AI 생성 예시 · 실제 조리·제품 사진이 아니에요.", { exact: true })).toHaveCount(0);
      await expect(sources.getByText("AI 생성 예시 이미지", { exact: true })).toHaveCount(0);
      const automatic = automaticPhotos[food.image];
      if (automatic) {
        await expect(sources.getByText(automatic.title, { exact: true })).toBeVisible();
        await expect(sources.getByRole("link", { name: /사진 라이선스/ })).toHaveAttribute("href", automatic.licenseUrl);
        await expect(sources.getByText(/운영자의 개별 검수는 하지 않았어요/)).toBeVisible();
        if (automatic.license.startsWith("CC BY")) await expect(sources.getByText(/변환본은 원본과 같은/)).toBeVisible();
      }
      if (food.image.startsWith("photo-reviewed-")) await page.screenshot({ path: `test-results/content/real-${food.slug}-${info.project.name}.png` });
    }
    await expect(page.getByText(/원본 영상 자리|좋아요 \d|참고 금액|검수했어요/)).toHaveCount(0);
    await expect(page.getByRole("img", { name: /검색량.*그래프/ })).toHaveCount(0);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/detail-${info.project.name}.png`, fullPage: true });
});

test("전체 카드의 이미지를 로드하고 생성 표시·찜·상세·재료 담기를 유지한다", async ({ page }, info) => {
  const food = snapshot.foods.find((food, index) => index > 0 && food.kind !== "discovery" && generatedImages[food.image])!;
  expect(snapshot.foods.every((item) => item.image !== "pending")).toBe(true);
  await page.goto("/");
  const cards = page.locator("#list li").filter({ has: page.getByRole("heading", { level: 3 }) });
  for (const item of await cards.all()) {
    const image = item.locator("img");
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await expect(cards.getByText("AI 생성 예시", { exact: true })).toHaveCount(snapshot.foods.slice(1).filter((item) => generatedImages[item.image]).length);
  await expect(cards.getByText("참고 사진", { exact: true })).toHaveCount(snapshot.foods.slice(1).filter((item) => item.image !== "pending" && !generatedImages[item.image]).length);
  const card = cards.filter({ has: page.getByRole("heading", { level: 3, name: food.name, exact: true }) });
  if (info.project.name === "desktop") await expect(card.getByText(food.why, { exact: true })).toBeVisible();
  else await expect(card.getByText(food.why, { exact: true })).toBeHidden();
  await expect(page.getByText(/사진 준비 중/)).toHaveCount(0);
  const like = card.getByRole("button", { name: `${food.name} 찜하기`, exact: true });
  await like.click(); await expect(like).toHaveAttribute("aria-pressed", "true");
  await card.screenshot({ path: `test-results/content/ai-card-${info.project.name}.png` });
  await card.getByRole("heading", { level: 3 }).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/food/${food.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(food.name);
  await expect(page.getByRole("button", { name: `${food.name} 찜하기`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#cart")).toBeVisible();
  await expect(page.getByRole("button", { name: /^장바구니|선택한 재료 통합 장바구니에 담기/ })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "통합 장바구니" })).toHaveCount(0);
  await expect(page.locator("#cart").getByRole("link", { name: /장보기 시작:/ })).toHaveAttribute("href", /coupang\.com/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
