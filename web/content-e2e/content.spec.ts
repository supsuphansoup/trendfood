import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "../src/data/content";

const snapshot = JSON.parse(readFileSync(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const automaticPhotos = JSON.parse(readFileSync(new URL("../src/data/content/auto-photo-credits.json", import.meta.url), "utf8")) as Record<string, { licenseUrl: string; license: string; title: string }>;
const generatedImages = JSON.parse(readFileSync(new URL("../src/data/content/generated-images.json", import.meta.url), "utf8")) as Record<string, { note: string }>;

test("수집 콘텐츠: 전체 음식, 큐레이션 표시와 검색", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("두바이 초콜릿");
  await expect(page.locator("#list li h3")).toHaveCount(snapshot.foods.length - 1);
  await expect(page.getByRole("button", { name: "추천순", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "좋아요순", exact: true })).toHaveCount(0);
  await expect(page.getByText(new RegExp(`출처 확인 ${snapshot.foods[0].checkedAt ?? snapshot.checkedAt}`))).toBeVisible();
  await expect(page.getByText("오늘 가장 많이 찾은 음식, 1위")).toHaveCount(0);
  await expect(page.getByText(/11위부터/)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/home-${info.project.name}.png` });

  await page.getByRole("searchbox").fill("타피오카");
  await page.getByRole("searchbox").press("Enter");
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.ingredients.some((ingredient) => ingredient.name.includes("타피오카")) || food.name.includes("타피오카") || food.why.includes("타피오카")).map((food) => food.name));
});

test("2020~2026 연도 필터와 공유 주소·검색 조합·뒤로가기가 일치한다", async ({ page }) => {
  await page.goto("/?year=2020");
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
    return heading && navigation ? heading.y >= navigation.y + navigation.height : false;
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

test("모든 상세에 출처·사용량·단계가 있고 가짜 수치·영상 자리가 없다", async ({ page }, info) => {
  test.setTimeout(Math.max(120_000, snapshot.foods.length * 1000));
  for (const food of snapshot.foods) {
    const response = await page.goto(`/food/${food.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(`${food.name} ${food.kind === "product" ? "제품 정보와 구매 안내" : "레시피와 재료"} | 트렌드푸드`);
    const sources = page.getByRole("region", { name: "참고한 출처" });
    await expect(sources).toBeVisible();
    expect(await sources.getByRole("link").count()).toBeGreaterThan(0);
    for (const link of await sources.getByRole("link").all()) await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(page.locator("#cart").getByText(/사용량/).first()).toBeVisible();
    const firstIngredient = food.ingredients.find((ingredient) => !ingredient.pantry);
    if (firstIngredient?.url) {
      const purchase = page.locator("#cart").getByRole("link", { name: `장보기 시작: ${firstIngredient.name}`, exact: true });
      await expect(purchase).toHaveAttribute("href", firstIngredient.url);
      await expect(purchase).toHaveAttribute("rel", /sponsored/);
    }
    await expect(page.getByRole("heading", { name: food.kind === "product" ? "고르고 즐기는 법" : "만드는 법" })).toBeVisible();
    if (food.history) {
      const history = page.getByRole("region", { name: /주목받은 시기/ });
      await expect(history).toBeVisible();
      expect(await history.getByRole("link").count()).toBeGreaterThan(0);
    } else await expect(page.getByText(/일상 레시피 ·/)).toBeVisible();
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
      await expect(page.locator('section[aria-label="음식 소개"] img')).toBeVisible();
      const automatic = automaticPhotos[food.image];
      if (automatic) {
        await expect(sources.getByText(automatic.title, { exact: true })).toBeVisible();
        await expect(sources.getByRole("link", { name: /사진 라이선스/ })).toHaveAttribute("href", automatic.licenseUrl);
        await expect(sources.getByText(/운영자의 개별 검수는 하지 않았어요/)).toBeVisible();
        if (automatic.license.startsWith("CC BY")) await expect(sources.getByText(/변환본은 원본과 같은/)).toBeVisible();
      }
    }
    await expect(page.getByText(/원본 영상 자리|좋아요 \d|참고 금액|검수했어요/)).toHaveCount(0);
    await expect(page.getByRole("img", { name: /검색량.*그래프/ })).toHaveCount(0);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/detail-${info.project.name}.png`, fullPage: true });
});

test("전체 카드의 이미지를 로드하고 생성 표시·찜·상세·재료 담기를 유지한다", async ({ page }, info) => {
  const food = snapshot.foods.find((food, index) => index > 0 && generatedImages[food.image])!;
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
  const card = cards.filter({ has: page.getByRole("heading", { level: 3, name: food.name, exact: true }) });
  await expect(card.getByText(food.why, { exact: true })).toBeVisible();
  await expect(page.getByText(/사진 준비 중/)).toHaveCount(0);
  const like = card.getByRole("button", { name: `${food.name} 찜하기`, exact: true });
  await like.click(); await expect(like).toHaveAttribute("aria-pressed", "true");
  await card.screenshot({ path: `test-results/content/ai-card-${info.project.name}.png` });
  await card.getByRole("heading", { level: 3 }).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/food/${food.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(food.name);
  await expect(page.getByRole("button", { name: `${food.name} 찜하기`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#cart")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
