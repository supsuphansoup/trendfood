import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "../src/data/content";
import type { GeneratedImage } from "../src/data/generated-images";
import { parseYouTubeId } from "../src/data/youtube";

const snapshot = JSON.parse(readFileSync(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const period = ({ history }: ContentSnapshot["foods"][number]) => history?.latestPeriod ?? String(Math.max(0, ...(history?.years ?? [])));
const trendFoods = snapshot.foods
  .filter((food) => food.history?.years.length || food.kind === "discovery")
  .sort((a, b) => period(b).localeCompare(period(a)));
const automaticPhotos = JSON.parse(readFileSync(new URL("../src/data/content/auto-photo-credits.json", import.meta.url), "utf8")) as Record<string, { url: string; licenseUrl: string; license: string; title: string; automatic?: boolean }>;
const generatedImages = JSON.parse(readFileSync(new URL("../src/data/content/generated-images.json", import.meta.url), "utf8")) as Record<string, GeneratedImage>;

test("정적 페이지와 음식 상세의 미리 불러오기 파일이 응답한다", async ({ request }) => {
  const paths = [
    "/about/__next.about.__PAGE__.txt",
    `/food/${trendFoods[0].slug}/__next.food.$d$slug.__PAGE__.txt`,
  ];
  for (const path of paths) {
    const response = await request.get(path, { params: { _rsc: "test" } });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("text/plain");
  }
});

test("첫 화면에서 추천 음식 사진과 출처 영상을 전환한다", async ({ page }, info) => {
  const foods = trendFoods.slice(0, 3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>YouTube 플레이어 자리</p>" }));
  await page.goto("/");
  const preview = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const photoBox = (await preview.locator("figure").boundingBox())!;
  for (const label of ["이전 추천 음식", "다음 추천 음식"]) {
    const box = (await page.getByRole("button", { name: label, exact: true }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y).toBeGreaterThanOrEqual(photoBox.y);
    expect(box.y + box.height).toBeLessThanOrEqual(photoBox.y + photoBox.height);
  }
  await page.screenshot({ path: `test-results/content/posters-${info.project.name}.png`, animations: "disabled" });
  const next = page.getByRole("button", { name: "다음 추천 음식", exact: true });
  await next.focus();
  await next.press("Enter");
  await expect(next).toBeFocused();
  await expect(preview.getByRole("heading", { name: foods[1].name, exact: true })).toBeVisible();
  expect(await preview.locator("figure img").evaluate((image) => image.getAnimations().some(({ effect }) =>
    effect instanceof KeyframeEffect && effect.getKeyframes().some((frame) => "transform" in frame)
  ))).toBe(false);
  await expect(preview.getByRole("link", { name: `${foods[1].name} 상세 보기` })).toHaveAttribute("href", `/food/${foods[1].slug}`);
  await expect(page.locator("iframe")).toHaveCount(0);

  const rankedWithVideo = foods.findIndex((food) => food.videoId || food.sources.some(({ url }) => parseYouTubeId(url)));
  if (rankedWithVideo !== -1) {
    if (rankedWithVideo === 0) await page.getByRole("button", { name: "이전 추천 음식" }).click();
    if (rankedWithVideo === 2) await next.click();
    const food = foods[rankedWithVideo];
    const id = food.videoId ?? food.sources.map(({ url }) => parseYouTubeId(url)).find(Boolean);
    const video = preview.getByRole("button", { name: "영상 보기" });
    await video.click();
    const dialog = page.getByRole("dialog", { name: `${food.name} 원본 영상` });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("iframe")).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${id}?playsinline=1`);
    await expect(dialog.getByRole("link", { name: "YouTube에서 보기" })).toHaveAttribute("href", `https://www.youtube.com/watch?v=${id}`);
    await expect(dialog.getByRole("button", { name: "영상 닫기" })).toBeFocused();
    expect(await dialog.locator("iframe").evaluate((frame: HTMLIFrameElement) => frame.offsetHeight)).toBeGreaterThanOrEqual(200);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(video).toBeFocused();
    await preview.getByRole("link", { name: "음식 살펴보기" }).click();
    if (!food.videoId) {
      await expect(page.locator("iframe")).toHaveCount(0);
      await page.getByRole("button", { name: "영상 보기" }).click();
      await expect(page.getByRole("dialog").locator("iframe")).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${id}?playsinline=1`);
    }
  }
});

test("추천 사진·제목·설명은 화면 한 장으로 이동하며 목록과 상세 동작을 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const preview = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const food = trendFoods[1];
  // 클릭 직후 첫 프레임에서 실제 사진이 오른쪽에서 중앙으로 이동하는지 확인한다.
  const offset = await page.getByRole("button", { name: "다음 추천 음식" }).evaluate(async (button: HTMLButtonElement) => {
    button.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return document.querySelector("#featured-trend-food")!.getBoundingClientRect().left;
  });
  expect(offset).toBeGreaterThan(0);
  await expect(preview.getByRole("heading", { name: food.name })).toBeVisible();
  await expect(preview.getByText(/^(다시 보는 유행|오늘 살펴볼 음식)/)).toBeVisible();
  await expect(preview.getByTestId("feature-description")).toBeVisible();
  await expect.poll(() => preview.evaluate((node) => node.getBoundingClientRect().left)).toBeCloseTo(0, 0);
  await expect(preview.getByRole("link", { name: `${food.name} 상세 보기` })).toHaveAttribute("href", `/food/${food.slug}`);
  await preview.getByRole("link", { name: "음식 살펴보기" }).click();
  const detail = page.getByRole("region", { name: "음식 소개", exact: true });
  await expect(detail.getByRole("heading", { level: 1 })).toHaveText(food.name);
  await expect(detail.locator(".motion-copy")).toHaveCSS("animation-name", "content-in");
  await expect(detail.locator(".motion-feature")).toHaveCSS("animation-name", "feature-in");

  await page.goto("/#list");
  const filters = page.getByRole("button", { name: "필터", exact: true });
  await filters.click();
  const panel = page.getByRole("complementary", { name: "음식 필터" });
  await expect(panel).toHaveCSS("animation-name", "filters-in");
  await filters.click();
  const category = page.getByRole("navigation", { name: "카테고리" }).getByRole("button", { name: /^일상 레시피/ });
  await category.click();
  await expect(category.getByText("일상 레시피")).toHaveCSS("animation-name", "content-in");
  const resultTitle = page.getByRole("heading", { name: "일상 레시피", exact: true });
  await expect.poll(() => resultTitle.evaluate((heading) => heading.parentElement?.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);
});

test("짧은 화면에서 양옆 화살표로 추천 음식을 연속으로 선택할 수 있다", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewports = info.project.name === "mobile" ? [{ width: 320, height: 568 }]
    : [{ width: 768, height: 390 }, { width: 844, height: 390 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const preview = page.getByRole("region", { name: "오늘의 음식", exact: true });
    await expect(page.getByRole("link", { name: "음식 목록", exact: true })).toBeInViewport({ ratio: 1 });
    const heading = preview.getByRole("heading", { level: 2 });
    const detail = preview.getByRole("link", { name: "음식 살펴보기" });
    const rank = preview.locator(".home-hero-rank");
    await expect(heading).toHaveText(trendFoods[0].name);
    const next = page.getByRole("button", { name: "다음 추천 음식", exact: true });
    await next.scrollIntoViewIfNeeded();
    for (const index of [1, 2, 0]) {
      await next.click();
      await expect(next).toBeInViewport({ ratio: 1 });
      await expect(heading).toHaveText(trendFoods[index].name);
      await expect(rank).toHaveText(`${index + 1}위`);
      await expect(rank).toBeInViewport({ ratio: 1 });
      await expect(heading).toHaveCSS("animation-name", "none");
      await expect(detail).toHaveAttribute("href", `/food/${trendFoods[index].slug}`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
});

test("대표 음식 이름 옆에 현재 순위만 표시하고 사진을 넘기면 함께 바뀐다", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const feature = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const title = feature.getByRole("heading", { level: 2 });
  const rank = feature.locator(".home-hero-rank");
  const previous = page.getByRole("button", { name: "이전 추천 음식", exact: true });
  const next = page.getByRole("button", { name: "다음 추천 음식", exact: true });
  const mobile = page.viewportSize()!.width < 768;
  await expect(page.getByRole("navigation", { name: "추천 음식 순위" })).toHaveCount(0);
  for (const index of [0, 1, 2]) {
    await expect(title).toHaveAccessibleName(trendFoods[index].name);
    await expect(rank).toHaveText(`${index + 1}위`);
    await expect(rank).toBeInViewport({ ratio: 1 });
    const titleBox = (await title.boundingBox())!;
    const rankBox = (await rank.boundingBox())!;
    expect(rankBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
    expect(rankBox.y).toBeLessThan(titleBox.y + titleBox.height);
    expect(rankBox.y + rankBox.height).toBeGreaterThan(titleBox.y);
    await expect(feature.getByRole("link", { name: "음식 살펴보기" })).toHaveAttribute("href", `/food/${trendFoods[index].slug}`);
    const photo = feature.locator("figure img");
    await photo.evaluate((image: HTMLImageElement) => image.decode());
    await expect(photo).toHaveCSS("object-fit", mobile ? "contain" : "cover");
    await page.screenshot({ path: `test-results/content/home-title-rank-${index + 1}-${info.project.name}.png` });
    await next.click();
  }
  await expect(rank).toHaveText("1위");
  await expect(title).toHaveAccessibleName(trendFoods[0].name);
  await previous.click();
  await expect(rank).toHaveText("3위");
  await expect(title).toHaveAccessibleName(trendFoods[2].name);
});

test("대표 음식의 전체 배경에서 상세로 연결하고 모바일에서 사진 원본 구도를 보여준다", async ({ page }, info) => {
  const food = trendFoods[0];
  const mobile = page.viewportSize()!.width < 768;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const feature = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const photo = feature.getByRole("link", { name: `${food.name} 상세 보기`, exact: true });
  await expect(photo).toHaveAttribute("href", `/food/${food.slug}`);
  const image = photo.getByRole("img");
  await image.evaluate((img: HTMLImageElement) => img.decode());
  await expect(image).toHaveCSS("object-fit", mobile ? "contain" : "cover");
  await expect(image).toHaveCSS("object-position", "50% 50%");
  await expect(photo.locator("img")).toHaveCount(1);
  const dimensions = (await image.boundingBox())!;
  const frame = (await feature.locator("figure").boundingBox())!;
  expect(dimensions.width).toBe(page.viewportSize()!.width);
  expect(dimensions.x).toBe(0);
  expect((await photo.boundingBox())!.height).toBe(frame.height);
  if (mobile) {
    expect(dimensions.height).toBeLessThan(frame.height);
    expect(dimensions.y).toBeGreaterThan(frame.y);
    const backdrop = await feature.locator("figure").evaluate((figure) => getComputedStyle(figure, "::before").backgroundImage);
    expect(backdrop).toContain((await image.getAttribute("src"))!);
  } else {
    expect(dimensions.height).toBe(frame.height);
  }
  await expect(image).toHaveCSS("border-radius", "0px");
  await page.screenshot({ path: `test-results/content/hero-fullscreen-${info.project.name}.png` });
  await photo.click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(new RegExp(`/food/${food.slug}/?$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(food.name);
  await page.goBack();
  await photo.focus();
  await photo.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/food/${food.slug}/?$`));
});

test("음식 탐색: 유행 배경을 먼저 보여주고 모음·검색·공유 주소를 유지한다", async ({ page }, info) => {
  await page.goto("/");
  const feature = page.getByRole("region", { name: "오늘의 음식", exact: true });
  await expect(feature.getByTestId("feature-description")).toHaveText((trendFoods[0].history?.note ?? trendFoods[0].why).split(/(?<=[.!?])\s+/)[0]);
  expect(await feature.getByTestId("feature-description").evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await expect(page.getByLabel("추천과 출처 안내")).not.toHaveAttribute("open");
  await expect(page.getByRole("link", { name: /재료 \d+개 담기|레시피 보기/ })).toHaveCount(0);
  if (snapshot.recommendation?.basis === "rotation" && trendFoods[0].history) await expect(feature.getByText(/^다시 보는 유행/)).toBeVisible();
  await expect(page.getByRole("link", { name: "음식 목록", exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: `test-results/content/discovery-home-${info.project.name}.png` });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const notes = page.getByLabel("추천과 출처 안내");
  await notes.locator("summary").focus();
  await notes.locator("summary").press("Enter");
  await expect(notes.getByText(new RegExp(`출처 확인 ${trendFoods[0].checkedAt ?? snapshot.checkedAt}`))).toBeVisible();
  await notes.locator("summary").press("Enter");
  await expect(notes).not.toHaveAttribute("open");
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  const collections = page.getByRole("navigation", { name: "음식 모음", exact: true });
  await collections.getByRole("button", { name: "유행 기록", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.map((food) => food.name));
  const ordered = await page.locator("#list li h3").allTextContents();
  const sameYear = ["yogurt-mochi", "pizza-seolgi", "mango-pomelo-sago", "butter-tteok", "bomdong-bibimbap", "dubai-chewy-cookie"];
  const examples = sameYear.map((slug) => snapshot.foods.find((food) => food.slug === slug)!.name);
  expect(ordered.filter((name) => examples.includes(name))).toEqual(examples);
  await expect(page.getByRole("navigation", { name: "카테고리", exact: true }).getByRole("button", { name: /^전체/ })).toHaveText(`전체${trendFoods.length}`);
  await expect(page).toHaveURL(/collection=trends/);
  await page.reload();
  await expect(collections.getByRole("button", { name: "유행 기록", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.map((food) => food.name));
  await page.getByRole("navigation", { name: "카테고리", exact: true }).getByRole("button", { name: /^일상 레시피/ }).click();
  await expect(page.locator("#list li").getByRole("heading")).toHaveText(snapshot.foods.filter((food) => !food.history?.years.length && (!food.kind || food.kind === "recipe")).map((food) => food.name));
  await expect(page).toHaveURL(/collection=everyday/);
  await page.goBack();
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.map((food) => food.name));
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.slice(1).map((food) => food.name));
  await page.screenshot({ path: `test-results/content/discovery-feed-${info.project.name}.png` });
  await page.getByRole("searchbox").fill("편의점까지");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.name.includes("편의점까지") || food.why.includes("편의점까지") || food.history?.note.includes("편의점까지") || food.ingredients.some((ingredient) => ingredient.name.includes("편의점까지"))).sort((a, b) => period(b).localeCompare(period(a))).map((food) => food.name));
  await page.goto("/?collection=unknown");
  await expect(collections.getByRole("button", { name: "유행 음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).not.toHaveURL(/collection=/);
  await collections.getByRole("button", { name: "유행 기록", exact: true }).click();
  await page.getByRole("button", { name: `${trendFoods[0].name} 찜하기`, exact: true }).click();
  await page.getByRole("navigation", { name: "카테고리", exact: true }).getByRole("button", { name: /^일상 레시피/ }).click();
  // 헤더의 찜은 현재 모음 밖에 저장한 음식도 보여준다.
  await page.getByRole("banner").getByRole("button", { name: "찜 1", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText([trendFoods[0].name]);
  await expect(page).not.toHaveURL(/collection=/);
});

test("일상 레시피 카테고리: 비유행 레시피만 모으고 연도·주소·상세·순위 복귀를 유지한다", async ({ page }, info) => {
  await page.goto("/");
  const original = await page.locator("#list li h3").allTextContents();
  const featureTitle = page.getByRole("region", { name: "오늘의 음식", exact: true }).getByRole("heading", { level: 2 });
  const cardTitles = page.locator("#list li").getByRole("heading");
  const recipes = snapshot.foods.filter((food) => !food.history?.years.length && (!food.kind || food.kind === "recipe"));
  expect(recipes.length).toBeGreaterThan(0);
  await page.goto("/?collection=trends&year=2026");
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  const everyday = categories.getByRole("button", { name: /^일상 레시피/ });
  await expect(everyday).toHaveText(`일상 레시피${recipes.length}`);
  await expect(page.getByRole("button", { name: /^일상 레시피/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^자취 요리/ })).toHaveCount(0);
  await page.getByRole("button", { name: "다음 추천 음식", exact: true }).click();
  await expect(featureTitle).toHaveText(trendFoods[1].name);
  await everyday.focus();
  await everyday.press("Enter");
  await expect(cardTitles).toHaveText(recipes.map((food) => food.name));
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(categories.locator('[aria-current="true"]')).toHaveCount(1);
  await expect(categories.getByRole("button", { name: /^전체/ })).toHaveText(`전체${trendFoods.length}`);
  await expect(page).toHaveURL(/collection=everyday/);
  await expect(page).not.toHaveURL(/year=|cat=/);
  await expect(featureTitle).toHaveText(trendFoods[1].name);
  await expect(page.getByRole("navigation", { name: "음식 모음", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "유행 연도", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await page.reload();
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(featureTitle).toHaveText(trendFoods[0].name);
  await expect(cardTitles).toHaveText(recipes.map((food) => food.name));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/everyday-category-${info.project.name}.png` });
  await page.getByRole("searchbox").fill("계란 파 라면");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(cardTitles).toHaveText(["계란 파 라면"]);
  await page.locator("#list").getByRole("link", { name: "음식 살펴보기", exact: true }).click();
  await expect(page.getByRole("region", { name: "재료 장바구니", exact: true })).toBeVisible();
  await page.goBack();
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(featureTitle).toBeVisible();
  await page.getByRole("button", { name: "검색어 지우기", exact: true }).click();
  await categories.getByRole("button", { name: /^전체/ }).click();
  await expect(cardTitles).toHaveText(original);
  await expect(featureTitle).toHaveText(trendFoods[0].name);
  await expect(page).not.toHaveURL(/collection=/);
  await page.goto("/?collection=everyday&year=2024");
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(page).not.toHaveURL(/year=/);
  await expect(cardTitles).toHaveText(recipes.map((food) => food.name));
});

test("추가 일상 레시피는 검색·실사·재료 분량과 일반 구매 검색을 제공한다", async ({ page }) => {
  await page.goto("/?collection=everyday&q=두부조림");
  await expect(page.locator("#list li").getByRole("heading")).toHaveText(["두부조림"]);
  await page.locator("#list").getByRole("link", { name: "음식 살펴보기", exact: true }).click();
  await expect(page).toHaveURL(/\/food\/dubu-jorim\/?$/);
  const food = snapshot.foods.find((food) => food.slug === "dubu-jorim")!;
  const cart = page.getByRole("region", { name: "재료 장바구니", exact: true });
  await expect(cart.getByRole("checkbox")).toHaveCount(food.ingredients.length);
  await expect(cart.getByText("사용량 300g", { exact: true })).toBeVisible();
  const purchase = cart.getByRole("link", { name: "장보기 시작: 두부", exact: true });
  await expect(purchase).toHaveAttribute("href", /^https:\/\/www\.coupang\.com\/np\/search\?/);
  await expect(purchase).toHaveAttribute("target", "_blank");
  const image = page.getByRole("region", { name: "음식 소개", exact: true }).getByRole("img", { name: food.alt, exact: true });
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.getByLabel("사진 정보", { exact: true }).locator("summary").click();
  await expect(page.getByRole("link", { name: /사진 출처/ })).toBeVisible();
  await expect(page.getByText(/AI 생성 예시 ·/)).toHaveCount(0);
});

test("로제떡볶이 기본 레시피와 두 음식의 플레이팅 사진을 보여 준다", async ({ page }, info) => {
  const cases = [
    ["로제떡볶이", "로제 떡볶이", "photo-ai-rose-tteokbokki-plated-20261126"],
    ["개성주악", "개성주악", "photo-history-gaeseong-juak-plated-20261126"],
  ] as const;

  for (const [name, query, imageKey] of cases) {
    await page.goto(`/?q=${encodeURIComponent(query)}`);
    const card = page.locator("#list li").filter({ has: page.getByRole("heading", { name, exact: true }) });
    const cardPhoto = card.getByRole("img");
    await expect(cardPhoto).toHaveAttribute("src", new RegExp(imageKey));
    await expect.poll(() => cardPhoto.evaluate((image: HTMLImageElement) => image.naturalWidth > 0)).toBe(true);
    await card.screenshot({ path: `test-results/content/${imageKey}-card-${info.project.name}.png` });
    await card.getByRole("link", { name: "음식 살펴보기", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
    const detailPhoto = page.getByRole("region", { name: "음식 소개", exact: true }).getByRole("img");
    await expect(detailPhoto).toHaveAttribute("src", new RegExp(imageKey));
    await expect.poll(() => detailPhoto.evaluate((image: HTMLImageElement) => image.naturalWidth > 0)).toBe(true);
    await detailPhoto.screenshot({ path: `test-results/content/${imageKey}-detail-${info.project.name}.png` });
    const photoInfo = page.getByLabel("사진 정보", { exact: true });
    await photoInfo.locator("summary").click();

    if (name === "로제떡볶이") {
      await expect(photoInfo.getByText("AI 생성 예시 이미지", { exact: true })).toBeVisible();
      await expect(photoInfo.getByRole("link", { name: /사진 출처/ })).toHaveCount(0);
      const ingredients = page.getByRole("region", { name: "재료 장바구니", exact: true });
      await expect(ingredients.getByRole("checkbox", { name: /우유/ })).toBeVisible();
      await expect(ingredients.getByRole("checkbox", { name: /어묵/ })).toBeVisible();
      await expect(page.locator("main").getByText(/새우/)).toHaveCount(0);
      await expect(page.getByRole("link", { name: /열려라쿡/ })).toHaveAttribute("href", "https://www.10000recipe.com/recipe/6966953");
    } else {
      await expect(photoInfo.getByRole("link", { name: /사진 출처/ })).toHaveAttribute("href", automaticPhotos[imageKey].url);
      await expect(photoInfo.getByRole("link", { name: /사진 라이선스/ })).toHaveAttribute("href", automaticPhotos[imageKey].licenseUrl);
    }
  }
});

test("재검토 사진은 카드와 상세에 일관되게 표시하고 사진 정보를 제공한다", async ({ page }, info) => {
  test.setTimeout(90_000);
  const latteArtImages = new Map([
    ["matcha-latte", "photo-ai-matcha-latte-art-20261126"],
    ["ube-latte", "photo-ai-ube-latte-art-20261126"],
  ]);
  const replacementImages = new Map([
    ["tteok-guk", "photo-everyday-tteok-guk-beef-20261126"],
    ["yubu-chobap", "photo-everyday-yubu-chobap-lunchbox-20261126"],
    ["budae-jjigae", "photo-everyday-budae-jjigae-plated-20261126"],
    ["egg-soup", "photo-ai-egg-soup-ribbons-20261126"],
    ["gyeran-jjim", "photo-ai-gyeran-jjim-microwave-20261126"],
  ]);
  for (const slug of [
    "dalgona-coffee", ...replacementImages.keys(), "cream-pasta", "gamja-jorim", "eomuk-bokkeum", "jeyuk-bokkeum",
    "udon-soup", "omurice", "janchi-guksu", "cucumber-muchim", "tuna-gimbap", ...latteArtImages.keys(),
    "butter-garaetteok", "soy-sauce-egg-rice", "dubai-chewy-cookie", "dubai-chocolate",
  ]) {
    const food = snapshot.foods.find((food) => food.slug === slug)!;
    const credit = automaticPhotos[food.image];
    const example = generatedImages[food.image];
    expect(Boolean(credit || example)).toBe(true);
    expect(Boolean(credit?.automatic || example?.automatic)).toBe(false);
    await page.goto(`/?q=${encodeURIComponent(food.name)}`);
    const card = page.locator("#list li").filter({ has: page.getByRole("heading", { name: food.name, exact: true }) });
    const image = card.getByRole("img", { name: food.alt, exact: true });
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const source = await image.getAttribute("src");
    const latteArtImage = latteArtImages.get(slug);
    if (latteArtImage) expect(source).toContain(latteArtImage);
    const replacementImage = replacementImages.get(slug);
    if (replacementImage) expect(source).toContain(replacementImage);
    if (slug === "butter-garaetteok") expect(source).toContain("photo-ai-butter-garaetteok-plated-20261125");
    if (slug === "dubai-chewy-cookie") expect(source).toContain("photo-ai-dubai-chewy-cookie-cut-20261126");
    if (slug === "dubai-chocolate") expect(source).toContain("photo-reviewed-dubai-chocolate-plate-20261126");
    await expect(card.getByText("참고 사진", { exact: true })).toHaveCount(0);
    await card.screenshot({ path: `test-results/content/reviewed-${slug}-card-${info.project.name}.png` });
    await card.getByRole("link", { name: "음식 살펴보기", exact: true }).click();
    const detail = page.getByRole("region", { name: "음식 소개", exact: true });
    const detailImage = detail.getByRole("img", { name: food.alt, exact: true });
    await expect(detailImage).toHaveAttribute("src", source!);
    if (latteArtImage) await detailImage.screenshot({ path: `test-results/content/latte-art-${slug}-${info.project.name}.png` });
    if (replacementImage) await detailImage.screenshot({ path: `test-results/content/reviewed-${slug}-photo-${info.project.name}.png` });
    await page.getByLabel("사진 정보", { exact: true }).locator("summary").click();
    if (credit) {
      await expect(page.getByRole("link", { name: /사진 출처/ })).toHaveAttribute("href", credit.url);
      if (credit.licenseUrl) await expect(page.getByRole("link", { name: /사진 라이선스/ })).toHaveAttribute("href", credit.licenseUrl);
      if (slug === "budae-jjigae") await expect(page.getByText("한국농수산식품유통공사 · 부대찌개(2019) · 공공누리 제1유형", { exact: true })).toBeVisible();
    } else {
      await expect(page.getByLabel("사진 정보", { exact: true }).getByText(/AI 생성 예시 ·/)).toBeVisible();
      await expect(page.getByRole("link", { name: /사진 출처/ })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (["dalgona-coffee", "egg-soup", "ube-latte", "cucumber-muchim", "dubai-chocolate", "dubai-chewy-cookie"].includes(slug)) {
      await page.screenshot({
        path: `test-results/content/reviewed-${slug}-detail-${info.project.name}.png`,
        fullPage: slug === "dubai-chocolate" || slug === "dubai-chewy-cookie",
      });
    }
  }
});

test("포켓몬빵은 제품과 다른 예시 사진 없이 삼립 출처와 공식 영상을 연다", async ({ page }, info) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>공식 영상 자리</p>" }));
  await page.goto("/?q=%ED%8F%AC%EC%BC%93%EB%AA%AC%EB%B9%B5");
  const card = page.locator("#list li").filter({ has: page.getByRole("heading", { name: "포켓몬빵", exact: true }) });
  await expect(card.locator("img")).toHaveCount(0);
  await card.screenshot({ path: `test-results/content/pokemon-official-card-${info.project.name}.png` });
  await card.getByRole("link", { name: "음식 살펴보기", exact: true }).click();
  const intro = page.getByRole("region", { name: "음식 소개", exact: true });
  await expect(intro.locator("img")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /삼립 · 돌아온 포켓몬빵/ })).toHaveAttribute("href", "https://spcsamlip.co.kr/company/history");
  const video = intro.getByRole("button", { name: "영상 보기", exact: true });
  await expect(video).toBeVisible();
  await page.screenshot({ path: `test-results/content/pokemon-official-detail-${info.project.name}.png` });
  await video.click();
  const dialog = page.getByRole("dialog", { name: "포켓몬빵 원본 영상" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/hU_xiUJePY0?playsinline=1");
  await expect(dialog.getByRole("link", { name: "YouTube에서 보기" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=hU_xiUJePY0");
});

test("수집 콘텐츠: 유행 음식만 최근에 확인된 유행 시기순으로 표시하고 통합 검색을 유지한다", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const intro = page.getByRole("main").getByRole("heading", { level: 1 });
  await expect(intro).toHaveText("유행 음식과 집밥");
  await expect(intro).toBeInViewport({ ratio: 1 });
  const feature = page.getByRole("region", { name: "오늘의 음식", exact: true });
  await expect(feature.getByRole("link", { name: "음식 살펴보기", exact: true })).toHaveAttribute("href", `/food/${trendFoods[0].slug}`);
  await expect(feature.locator("figcaption")).toHaveCount(0);
  await expect(feature.getByText(/^(AI 생성 예시|참고 사진)$/)).toHaveCount(0);
  await expect(feature.locator("figure img").last()).toBeVisible();
  await expect(feature.getByTestId("feature-description")).toHaveCSS("font-size", info.project.name === "desktop" ? "20px" : "16px");
  await expect(feature.getByRole("heading", { level: 2 })).toHaveText(trendFoods[0].name);
  const notesBox = (await page.getByLabel("추천과 출처 안내").boundingBox())!;
  const featureBox = (await feature.boundingBox())!;
  expect(notesBox.y).toBeGreaterThanOrEqual(featureBox.y + featureBox.height);
  await page.screenshot({ path: `test-results/content/intro-home-${info.project.name}.png` });
  await page.getByText("AI 안내·출처 정보", { exact: true }).click();
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(feature.getByRole("heading", { level: 2 })).toHaveText(trendFoods[0].name);
  if (snapshot.recommendation) {
    await expect(page.getByTestId("recommendation-edition")).toContainText(`추천 갱신 ${snapshot.recommendation.date}`);
    if (snapshot.recommendation.basis === "rotation") {
      await expect(page.getByTestId("recommendation-edition")).toContainText("기존 음식 돌아보기");
      await expect(page.getByText(/새로 추가/)).toHaveCount(0);
    }
  }
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.slice(1).map((food) => food.name));
  await expect(page.getByRole("button", { name: "최신 유행순", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^장바구니/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "좋아요순", exact: true })).toHaveCount(0);
  await expect(page.getByText(new RegExp(`출처 확인 ${trendFoods[0].checkedAt ?? snapshot.checkedAt}`))).toBeVisible();
  await expect(page.getByText("오늘 가장 많이 찾은 음식", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/11위부터/)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/home-${info.project.name}.png` });
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  await expect(page.locator("#list h2")).toBeInViewport();
  // 펼친 필터가 상단 탐색 아래로 일부만 남지 않게 목록 시작을 맞춘다.
  const stickyBottom = await page.getByRole("region", { name: "필터 설정" }).evaluate((el) => el.getBoundingClientRect().bottom);
  const listTop = await page.locator("#list").evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(listTop - stickyBottom)).toBeLessThanOrEqual(2);
  expect((await page.locator("#food-grid").boundingBox())!.width).toBe(page.viewportSize()!.width - 40);
  const cards = page.locator(".food-grid > li").filter({ has: page.getByRole("heading", { level: 3 }) });
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  const firstPhoto = (await cards.first().getByRole("img").boundingBox())!;
  expect(firstPhoto.width / firstPhoto.height).toBeCloseTo(info.project.name === "desktop" ? 3 / 2 : 4 / 3, 2);
  expect(Math.abs(first.y - second.y)).toBeLessThan(2);
  expect(second.x).toBeGreaterThan(first.x + first.width);
  const third = (await cards.nth(2).boundingBox())!;
  expect(third.y).toBeGreaterThanOrEqual(first.y + first.height);
  expect(third.width).toBeCloseTo(first.width, 0);
  await expect(cards.first().getByText(/^(AI 생성 예시|참고 사진)$/)).toHaveCount(0);
  // 목록은 두 줄 미리보기로 높이를 줄이고 전문은 상세에서 제공한다.
  for (const description of await cards.getByTestId("food-description").all()) {
    await expect(description).toHaveCSS("font-size", info.project.name === "desktop" ? "18px" : "14px");
    expect(await description.evaluate((el) => el.clientHeight <= parseFloat(getComputedStyle(el).lineHeight) * 2 + 1)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/content/feed-${info.project.name}.png` });
  const layout = page.locator('button[aria-controls="food-grid"]');
  await expect(layout).toHaveCount(1);
  await expect(layout).toHaveAccessibleName("현재 크게 보기, 모아 보기로 전환");
  await expect(layout).toHaveText("");
  await expect(layout.locator("svg")).toHaveCount(1);
  await expect(layout.locator("svg")).toHaveClass(/lucide-grid-2x2/);
  await layout.press("Enter");
  await expect(layout).toHaveAccessibleName("현재 모아 보기, 크게 보기로 전환");
  await expect(layout).toHaveText("");
  await expect(layout.locator("svg")).toHaveCount(1);
  await expect(layout.locator("svg")).toHaveClass(/lucide-grid-3x3/);
  await expect(cards.getByTestId("food-description")).toHaveCount(0);
  const firstFood = trendFoods[1];
  await expect(cards.first()).toHaveText(`${firstFood.category}${firstFood.name}`);
  await expect(cards.first()).toHaveCSS("transform", "none");
  const compactFirst = (await cards.nth(0).boundingBox())!;
  const compactThird = (await cards.nth(2).boundingBox())!;
  expect(compactThird.y).toBeCloseTo(compactFirst.y, 0);
  expect(compactThird.x).toBeGreaterThan(compactFirst.x);
  expect(compactFirst.width).toBeLessThan(first.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/content/feed-three-columns-${info.project.name}.png` });
  await cards.first().getByRole("link", { name: firstFood.name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(firstFood.name);
  await page.goBack();
  await expect(layout).toHaveAccessibleName("현재 모아 보기, 크게 보기로 전환");
  await expect(cards.first()).toHaveText(`${firstFood.category}${firstFood.name}`);
  await page.reload();
  await expect(layout.locator("svg")).toHaveClass(/lucide-grid-3x3/);
  await layout.click();
  await expect(layout.locator("svg")).toHaveClass(/lucide-grid-2x2/);
  await expect(cards.first().getByTestId("food-description")).toBeVisible();
  expect((await cards.nth(2).boundingBox())!.y).toBeGreaterThan((await cards.nth(0).boundingBox())!.y);

  await page.getByRole("searchbox").fill("타피오카");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.ingredients.some((ingredient) => ingredient.name.includes("타피오카")) || food.name.includes("타피오카") || food.why.includes("타피오카")).map((food) => food.name));
});

test("넓은 PC에서 2열·3열 모두 카드 폭에 맞춰 사진을 3:2로 배치한다", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "넓은 PC 화면에서 확인하는 동작");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#list");
  const grid = page.locator("#food-grid");
  const layout = page.locator('button[aria-controls="food-grid"]');
  const photo = grid.getByRole("img").first();
  for (const columns of [2, 3]) {
    await expect(grid).toHaveClass(new RegExp(`grid-cols-${columns}`));
    const { x, width } = (await grid.boundingBox())!;
    expect(width).toBe(1360);
    expect(x).toBe((1920 - width) / 2);
    const photoBox = (await photo.boundingBox())!;
    expect(photoBox.width / photoBox.height).toBeCloseTo(3 / 2, 2);
    await expect(photo).toHaveCSS("object-fit", "contain");
    await photo.scrollIntoViewIfNeeded();
    await Promise.all((await grid.getByRole("img").all()).slice(0, columns).map((image) => image.evaluate((img: HTMLImageElement) => img.decode())));
    await page.screenshot({ path: `test-results/content/feed-wide-${columns}-columns.png` });
    if (columns === 2) await layout.click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("목록의 세로 사진은 2열과 3열에서 잘리지 않고 가리켜도 확대되지 않는다", async ({ page }, info) => {
  const food = snapshot.foods.find((item) => item.slug === "cucumber-muchim")!;
  await page.goto(`/?q=${encodeURIComponent(food.name)}#list`);
  const card = page.locator("#food-grid > li").filter({ has: page.getByRole("heading", { name: food.name, exact: true }) });
  const photo = card.getByRole("link", { name: `${food.name} 상세 보기`, exact: true }).getByRole("img");
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalHeight > image.naturalWidth && image.naturalWidth > 0)).toBe(true);
  const layout = page.locator('button[aria-controls="food-grid"]');
  for (const columns of [2, 3]) {
    await expect(page.locator("#food-grid")).toHaveClass(new RegExp(`grid-cols-${columns}`));
    await photo.hover();
    await expect(photo).toHaveCSS("object-fit", "contain");
    await expect(photo).toHaveCSS("object-position", "50% 50%");
    await expect(photo).toHaveCSS("scale", "none");
    if (columns === 2) await layout.click();
  }
  await card.screenshot({ path: `test-results/content/portrait-card-${info.project.name}.png` });
  await photo.click();
  await expect(page).toHaveURL(/\/food\/cucumber-muchim\/?$/);
});

test("보기 전환 양방향에서 음식 사진이 원래 위치에서 새 열로 이동한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#list");
  const toggle = page.locator('button[aria-controls="food-grid"]');
  await toggle.scrollIntoViewIfNeeded();
  for (const compact of [true, false]) {
    const scale = await toggle.evaluate(async (button: HTMLButtonElement) => {
      button.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const card = document.querySelector("#food-grid li[data-motion-result]")!;
      const transform = getComputedStyle(card).transform;
      const scale = transform === "none" ? 1 : new DOMMatrix(transform).a;
      await Promise.all(card.getAnimations().map((animation) => animation.finished));
      return scale;
    });
    if (compact) expect(scale).toBeGreaterThan(1);
    else expect(scale).toBeLessThan(1);
  }
});

test("디저트 탭은 기존 간식과 디저트를 함께 집계하고 카드와 상세에도 디저트로 표시한다", async ({ page }, info) => {
  const desserts = trendFoods.filter((food) => food.category === "디저트" || food.category === "간식");
  const snack = desserts.find((food) => food.category === "간식")!;
  await page.goto("/");
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  const tab = categories.getByRole("button", { name: /^디저트/ });
  await expect(tab).toHaveText(`디저트${desserts.length}`);
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#food-grid li h3")).toHaveText(desserts.map((food) => food.name));
  const card = page.locator("#food-grid li").filter({ has: page.getByRole("heading", { name: snack.name, exact: true }) });
  await expect(card.getByText("디저트", { exact: true })).toBeVisible();
  await tab.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/content/dessert-category-${info.project.name}.png` });
  await card.getByRole("link", { name: snack.name, exact: true }).click();
  await expect(page.getByRole("navigation", { name: "현재 위치" }).getByText("디저트", { exact: true })).toBeVisible();
});

test("간식 탭 없이 기존 간식 주소는 전체로 열리고 음식 검색을 유지한다", async ({ page }, info) => {
  await page.goto("/?cat=" + encodeURIComponent("간식"));
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  await expect(categories.getByRole("button", { name: /^간식/ })).toHaveCount(0);
  await expect(categories.getByRole("button", { name: /^전체/ })).toHaveAttribute("aria-current", "true");
  await expect(page).not.toHaveURL(/cat=/);
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.slice(1).map((food) => food.name));
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
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
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  await filters.getByRole("button", { name: "조리시간순", exact: true }).click();
  await filters.getByRole("button", { name: "#10분컷", exact: true }).click();
  await expect(page).toHaveURL(/sort=/);
  await expect(page).toHaveURL(/tag=10/);
  const expected = trendFoods.filter((food) => food.tags.includes("10분컷"))
    .sort((a, b) => (a.kind === "discovery" ? Infinity : a.cookMinutes) - (b.kind === "discovery" ? Infinity : b.cookMinutes));
  await expect(page.locator("#list li h3")).toHaveText(expected.map((food) => food.name));
  await page.screenshot({ path: `test-results/content/sidebar-filters-${info.project.name}.png` });
  await filters.getByRole("button", { name: "#10분컷", exact: true }).click();
  await filters.getByRole("button", { name: "최신 유행순", exact: true }).click();
  await years.getByRole("button", { name: "2024년", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.filter((food) => food.history?.years.includes(2024)).map((food) => food.name));
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
    await expect(page.locator("#list li h3")).toHaveText(trendFoods.filter((food) => food.history?.years.includes(year)).map((food) => food.name));
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
  await expect(page.locator("#list li h3")).toHaveText(trendFoods.slice(1).map((food) => food.name));
  await page.goBack();
  await expect(page.locator("#list li h3")).toHaveText(["밤 티라미수"]);
});

test("요아정은 2024년 검색 결과에서 먹방 유행 출처와 가정용 레시피로 연결된다", async ({ page, request }, info) => {
  await page.goto(`/?year=2024&q=${encodeURIComponent("요아정")}`);
  const list = page.locator("#list");
  const name = "요아정 스타일 요거트 아이스크림";
  const card = list.getByRole("heading", { name, exact: true });
  await expect(list.getByRole("heading", { level: 3 })).toHaveText([name]);
  await expect(list.getByText(/먹방에서 요아정에 과일과 벌집꿀/)).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/content/history-2024-${info.project.name}.png` });

  await card.click();
  await expect(page).toHaveURL(/\/food\/yogurt-ice-cream\/?$/);
  await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
  const history = page.getByRole("region", { name: "주목받은 시기 · 2024년" });
  await expect(history.getByRole("link", { name: /뉴시스/ })).toHaveAttribute("href", "https://www.newsis.com/view/NISX20240816_0002852073");
  await expect(page.locator("#recipe").getByRole("heading", { name: "만드는 법" })).toBeVisible();
  await page.screenshot({ path: `test-results/content/history-yoajung-${info.project.name}.png`, fullPage: true });
  expect((await request.get("/food/greek-yogurt")).status()).toBe(404);
  expect((await request.get("/food/knotted-cream-donut")).status()).toBe(404);
});

test("바이럴 출처가 확인된 음식은 해당 연도에, 민트초코 라떼는 일상 레시피에 표시한다", async ({ page, request }, info) => {
  await page.goto("/");
  const list = page.locator("#list");
  for (const name of ["샤인머스캣", "크런치 27 큐브", "민트초코 라떼"]) {
    await expect(list.getByRole("heading", { name, exact: true })).toHaveCount(0);
  }
  for (const slug of ["shine-muscat", "crunch-27-cube"]) {
    expect((await request.get(`/food/${slug}`)).status()).toBe(404);
  }

  await page.getByRole("navigation", { name: "카테고리" }).getByRole("button", { name: /^일상 레시피/ }).click();
  const mint = page.getByRole("heading", { name: "민트초코 라떼", exact: true });
  const mintCard = list.locator("li").filter({ has: mint });
  await expect(mintCard).toBeVisible();
  await mintCard.screenshot({ path: `test-results/content/viral-audit-everyday-${info.project.name}.png` });
  await mintCard.getByRole("link", { name: "음식 살펴보기", exact: true }).click();
  await expect(page).toHaveURL(/\/food\/mint-choco-latte\/?$/);
  await expect(page.locator("#recipe").getByRole("heading", { name: "만드는 법" })).toBeVisible();
  await expect(page.getByRole("region", { name: /주목받은 시기/ })).toHaveCount(0);

  const query = encodeURIComponent("들기름 막국수");
  await page.goto(`/?year=2021&q=${query}`);
  await expect(list.getByRole("heading", { name: "들기름 막국수", exact: true })).toHaveCount(0);
  await page.goto(`/?year=2023&q=${query}`);
  const noodles = page.getByRole("heading", { name: "들기름 막국수", exact: true });
  const noodlesCard = list.locator("li").filter({ has: noodles });
  await expect(noodlesCard.getByText(/BTS 정국이 라이브/)).toBeVisible();
  await noodlesCard.screenshot({ path: `test-results/content/viral-audit-2023-${info.project.name}.png` });
  await noodlesCard.getByRole("link", { name: "음식 살펴보기", exact: true }).click();
  const history = page.getByRole("region", { name: "주목받은 시기 · 2023년" });
  await expect(history.getByText(/참소스로 만드는 레시피/)).toBeVisible();
  await expect(history.getByRole("link", { name: /머니투데이/ })).toHaveAttribute("href", "https://www.mt.co.kr/amp/entertainment/2023/04/26/2023042611001375980");
});

test("추가한 바이럴 음식 6개를 유행 연도별로 찾고 상세 근거를 볼 수 있다", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const foods = [
    { name: "아망추", slug: "amangchu", year: 2024, evidence: /1만 5천 잔/ },
    { name: "창억떡 호박인절미", slug: "changeok-pumpkin-injeolmi", year: 2026, evidence: /배송 지연/ },
    { name: "불그리", slug: "bulguri", year: 2023, evidence: /330만 회/ },
    { name: "개성주악", slug: "gaeseong-juak", year: 2023, evidence: /2만 8천 건/ },
    { name: "얼먹 젤리", slug: "frozen-jelly-asmr", year: 2026, evidence: /44\.6%/ },
    { name: "컵라면 볶음밥", slug: "cup-noodle-fried-rice", year: 2021, evidence: /1천 건/ },
  ];
  for (const { name, slug, year, evidence } of foods) {
    const photoAlt = slug === "gaeseong-juak" ? /윤기 나는 개성주악/ : /AI 생성 예시 이미지/;
    await page.goto(`/?year=${year}&q=${encodeURIComponent(name)}`);
    const list = page.locator("#list");
    const heading = page.getByRole("heading", { level: 3, name, exact: true });
    const card = list.locator("li").filter({ has: heading });
    await expect(card.getByTestId("food-description")).toHaveText(evidence);
    const cardPhoto = card.getByRole("img", { name: photoAlt });
    await expect(cardPhoto).toBeVisible();
    await expect.poll(() => cardPhoto.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await card.screenshot({ path: `test-results/content/viral-card-${slug}-${info.project.name}.png` });

    await heading.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/food/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    const history = page.getByRole("region", { name: `주목받은 시기 · ${year}년` });
    await expect(history.getByRole("paragraph")).toHaveText(evidence);
    expect(await history.getByRole("link").count()).toBeGreaterThanOrEqual(2);
    const intro = page.getByRole("region", { name: "음식 소개", exact: true });
    const photo = intro.getByRole("img", { name: photoAlt });
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const photoInfo = page.getByLabel("사진 정보", { exact: true });
    await photoInfo.locator("summary").click();
    if (slug === "gaeseong-juak") {
      await expect(photoInfo.getByRole("link", { name: /사진 라이선스 · 공공누리 제1유형/ })).toHaveAttribute("href", "https://www.kogl.or.kr/info/licenseType1.do");
    } else {
      await expect(photoInfo.getByText("AI 생성 예시 · 실제 조리·제품 사진이 아니에요.", { exact: true })).toBeVisible();
    }
    await page.screenshot({ path: `test-results/content/viral-detail-${slug}-${info.project.name}.png`, fullPage: true });
  }
});

test("음식 상세의 두 출처 목록은 각각 3개부터 더보기로 펼친다", async ({ page }, info) => {
  for (const slug of ["croffle", "bulguri", "yogurt-mochi"]) {
    const food = snapshot.foods.find((item) => item.slug === slug)!;
    await page.goto(`/food/${slug}`);
    const lists = [
      { region: page.getByRole("region", { name: /^주목받은 시기/ }), entries: food.history!.sources },
      { region: page.getByRole("region", { name: "참고한 출처", exact: true }), entries: food.sources },
    ];

    for (const { region, entries } of lists) {
      const links = region.getByRole("link");
      const summary = region.locator("summary").filter({ hasText: "더보기" });
      await expect(links).toHaveCount(Math.min(2, entries.length));
      expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))).toEqual(entries.slice(0, 2).map(({ url }) => url));

      if (entries.length < 3) {
        await expect(summary).toHaveCount(0);
        continue;
      }

      if (slug === "yogurt-mochi" && region === lists[0].region) {
        await region.screenshot({ path: `test-results/content/detail-history-links-${info.project.name}.png` });
      }
      await expect(summary.getByText("더보기", { exact: true })).toBeVisible();
      await summary.focus();
      await summary.press("Enter");
      await expect(summary.getByText("접기", { exact: true })).toBeVisible();
      await expect(links).toHaveCount(entries.length);
      expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))).toEqual(entries.map(({ url }) => url));
      const other = lists.find((list) => list.region !== region)!;
      await expect(other.region.getByRole("link")).toHaveCount(Math.min(2, other.entries.length));

      if (slug === "yogurt-mochi" && region === lists[1].region) {
        await region.screenshot({ path: `test-results/content/detail-expanded-sources-${info.project.name}.png` });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      }
      await summary.click();
      await expect(summary.getByText("더보기", { exact: true })).toBeVisible();
      await expect(links).toHaveCount(2);
    }
  }
});

test("모든 상세에 출처가 있고 레시피에만 사용량·단계를 제공하며 가짜 수치는 없다", async ({ page }, info) => {
  test.setTimeout(Math.max(120_000, snapshot.foods.length * 1000));
  for (const food of snapshot.foods) {
    const response = await page.goto(`/food/${food.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(`${food.name} ${food.kind === "discovery" ? "음식 정보와 출처" : food.kind === "product" ? "제품 정보와 구매 안내" : "레시피와 재료"} | vviralfood`);
    const sources = page.getByRole("region", { name: "참고한 출처" });
    await expect(sources).toBeVisible();
    expect(await sources.getByRole("link").count()).toBeGreaterThan(0);
    for (const link of await sources.getByRole("link").all()) await expect(link).toHaveAttribute("href", /^https:\/\//);
    if (food.kind === "discovery") {
      await expect(page.locator("#cart, #recipe")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "소개 출처 보기" })).toBeVisible();
    } else {
      await expect(page.locator("#cart").getByText(/사용량/).first()).toBeVisible();
      const headings = page.getByRole("main").getByRole("heading", { level: 2 });
      await expect(headings.nth(0)).toHaveText(food.kind === "product" ? "제품 장바구니" : "재료 장바구니");
      await expect(headings.nth(1)).toHaveText(food.kind === "product" ? "고르고 즐기는 법" : "만드는 법");
      await expect(headings.nth(2)).toHaveText("어떤 음식인가요");
      const cart = (await page.locator("#cart").boundingBox())!;
      const recipe = (await page.locator("#recipe").boundingBox())!;
      const introduction = (await headings.nth(2).boundingBox())!;
      const sourceBox = (await sources.boundingBox())!;
      const cookingBottom = Math.max(cart.y + cart.height, recipe.y + recipe.height);
      expect(introduction.y).toBeGreaterThan(cookingBottom);
      expect(sourceBox.y).toBeGreaterThan(cookingBottom);
      if (food.slug === "dubai-chewy-cookie") {
        await page.locator("#cart").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/content/detail-cooking-first-${info.project.name}.png` });
        await headings.nth(2).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/content/detail-introduction-bottom-${info.project.name}.png` });
      }
    }
    await expect(page.getByRole("heading", { name: "편의점·마트에서 사서 맛보기", exact: true })).toHaveCount(0);
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
    const photoInfo = page.getByLabel("사진 정보", { exact: true });
    if (food.image !== "pending") {
      await expect(photoInfo).toHaveJSProperty("open", false);
      await expect(photoInfo.getByText(/^(AI 생성 예시|참고 사진) ·/)).toBeHidden();
      await expect(page.getByRole("region", { name: "음식 소개", exact: true }).getByText(/^(AI 생성 예시|참고 사진)/)).toHaveCount(0);
      await photoInfo.locator("summary").click();
    }
    if (food.image === "pending") {
      const introduction = page.getByRole("region", { name: "음식 소개", exact: true });
      await expect(introduction.locator('img, [role="img"]')).toHaveCount(0);
      await expect(page.getByText(/사진 준비 중/)).toHaveCount(0);
      await expect(introduction.locator(":scope > div")).toHaveCount(1);
      if (food.slug === "matcha-latte") await page.screenshot({ path: `test-results/content/photo-review-${info.project.name}.png`, fullPage: true });
      if (food.slug === "dubai-chewy-cookie") await page.screenshot({ path: `test-results/content/photo-review-dubai-chewy-cookie-${info.project.name}.png`, fullPage: true });
    } else if (generatedImages[food.image]) {
      const introduction = page.getByRole("region", { name: "음식 소개", exact: true });
      await expect(introduction.getByRole("img", { name: food.alt, exact: true })).toBeVisible();
      await expect(photoInfo.getByText("AI 생성 예시 · 실제 조리·제품 사진이 아니에요.", { exact: true })).toBeVisible();
      await expect(sources.getByText("AI 생성 예시 이미지", { exact: true })).toBeVisible();
      await expect(sources.getByText(generatedImages[food.image].note, { exact: true })).toBeVisible();
      const reference = generatedImages[food.image].reference;
      if (reference) {
        await expect(photoInfo.getByRole("link", { name: /생성 참고 원본/ })).toHaveAttribute("href", reference.url);
        await expect(photoInfo.getByRole("link", { name: /참고 사진·변환본 이용 조건/ })).toHaveAttribute("href", reference.licenseUrl!);
        await page.screenshot({ path: `test-results/content/auto-generated-${food.slug}-${info.project.name}.png`, fullPage: true });
      }
      await expect(page.getByRole("link", { name: /사진 출처|사진 라이선스/ })).toHaveCount(0);
      expect(await introduction.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      if (food.image.endsWith("-natural-20261125") || food.image.endsWith("-home-20261125") || food.image.endsWith("-plated-20261125")) {
        await introduction.getByRole("img", { name: food.alt, exact: true }).screenshot({ path: `test-results/content/photo-${food.slug}-${info.project.name}.png` });
      }
      if (food.slug === "matcha-latte" || food.slug === "dubai-chewy-cookie") await page.screenshot({ path: `test-results/content/ai-${food.slug}-${info.project.name}.png`, fullPage: true });
    } else {
      await expect(page.getByRole("link", { name: /사진 출처/ })).toBeVisible();
      const introduction = page.getByRole("region", { name: "음식 소개", exact: true });
      const image = introduction.getByRole("img", { name: food.alt, exact: true });
      await expect(image).toBeVisible();
      await expect(photoInfo.getByText(food.kind === "discovery" ? "참고 사진 · 소개된 판매 제품과 다를 수 있어요." : "참고 사진 · 이 레시피를 직접 조리한 완성 사진은 아니에요.", { exact: true })).toBeVisible();
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
        if (automatic.automatic) await expect(sources.getByText(/운영자의 개별 검수는 하지 않았어요/)).toBeVisible();
        if (automatic.license.startsWith("CC BY")) await expect(sources.getByText(/변환본은 원본과 같은/)).toBeVisible();
      }
      if (food.image.endsWith("-20261125")) await image.screenshot({ path: `test-results/content/photo-${food.slug}-${info.project.name}.png` });
      if (food.image.startsWith("photo-reviewed-")) await page.screenshot({ path: `test-results/content/real-${food.slug}-${info.project.name}.png` });
      if (food.slug === "kimchi-fried-rice") await page.screenshot({ path: `test-results/content/everyday-detail-${info.project.name}.png`, fullPage: true });
    }
    await expect(page.getByText(/원본 영상 자리|좋아요 \d|참고 금액|검수했어요/)).toHaveCount(0);
    await expect(page.getByRole("img", { name: /검색량.*그래프/ })).toHaveCount(0);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/detail-${info.project.name}.png`, fullPage: true });
});

test("사진 유형은 상세의 접힌 정보에서 확인하고 찜·재료 담기를 유지한다", async ({ page }, info) => {
  const food = snapshot.foods.find((food, index) => index > 0 && food.kind !== "discovery" && generatedImages[food.image])!;
  await page.goto("/");
  const cards = page.locator("#list li").filter({ has: page.getByRole("heading", { level: 3 }) });
  for (const item of await cards.all()) {
    const href = await item.getByRole("heading", { level: 3 }).getByRole("link").getAttribute("href");
    const entry = snapshot.foods.find((food) => `/food/${food.slug}` === href);
    expect(entry, href ?? "카드의 상세 주소").toBeDefined();
    const image = item.locator("img");
    if (entry?.image === "pending") {
      await expect(image).toHaveCount(0);
      continue;
    }
    // 고정 메뉴와 맨 위로 버튼 사이에서 사진의 클릭 영역을 확인한다.
    await image.evaluate((img) => img.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    for (const x of [0.1, 0.5, 0.9]) {
      expect(await image.evaluate((img, x) => {
        const box = img.getBoundingClientRect();
        return document.elementFromPoint(box.x + box.width * x, box.y + box.height / 2)?.closest("a")?.getAttribute("href");
      }, x)).toBe(href);
    }
  }
  await expect(cards.getByText(/^(AI 생성 예시|참고 사진)$/)).toHaveCount(0);
  const card = cards.filter({ has: page.getByRole("heading", { level: 3, name: food.name, exact: true }) });
  await expect(card.getByTestId("food-description")).toHaveText(food.history?.note ?? food.why);
  await expect(page.getByText(/사진 준비 중/)).toHaveCount(0);
  const like = card.getByRole("button", { name: `${food.name} 찜하기`, exact: true });
  await like.click(); await expect(like).toHaveAttribute("aria-pressed", "true");
  await card.screenshot({ path: `test-results/content/ai-card-${info.project.name}.png` });
  await card.getByRole("heading", { level: 3 }).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/food/${food.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(food.name);
  await expect(page.getByRole("region", { name: "음식 소개", exact: true }).getByText(/AI 생성 예시|참고 사진/)).toHaveCount(0);
  const photoInfo = page.getByLabel("사진 정보", { exact: true });
  const notice = photoInfo.getByText("AI 생성 예시 · 실제 조리·제품 사진이 아니에요.", { exact: true });
  await expect(photoInfo).toHaveJSProperty("open", false);
  await expect(notice).toBeHidden();
  await page.screenshot({ path: `test-results/content/photo-info-closed-${info.project.name}.png` });
  const toggle = photoInfo.locator("summary");
  await toggle.focus();
  await toggle.press("Enter");
  await expect(notice).toBeVisible();
  await expect(photoInfo.getByText(generatedImages[food.image].note, { exact: true })).toBeVisible();
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await photoInfo.screenshot({ path: `test-results/content/photo-info-open-${info.project.name}.png` });
  await toggle.click();
  await expect(notice).toBeHidden();
  await expect(page.getByRole("button", { name: `${food.name} 찜하기`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#cart")).toBeVisible();
  await expect(page.getByRole("button", { name: /^장바구니|선택한 재료 통합 장바구니에 담기/ })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "통합 장바구니" })).toHaveCount(0);
  await expect(page.locator("#cart").getByRole("link", { name: /장보기 시작:/ })).toHaveAttribute("href", /coupang\.com/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
