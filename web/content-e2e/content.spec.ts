import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "../src/data/content";
import type { GeneratedImage } from "../src/data/generated-images";
import { parseYouTubeId } from "../src/data/youtube";

const snapshot = JSON.parse(readFileSync(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const automaticPhotos = JSON.parse(readFileSync(new URL("../src/data/content/auto-photo-credits.json", import.meta.url), "utf8")) as Record<string, { url: string; licenseUrl: string; license: string; title: string; automatic?: boolean }>;
const generatedImages = JSON.parse(readFileSync(new URL("../src/data/content/generated-images.json", import.meta.url), "utf8")) as Record<string, GeneratedImage>;

test("정적 페이지와 음식 상세의 미리 불러오기 파일이 응답한다", async ({ request }) => {
  const paths = [
    "/about/__next.about.__PAGE__.txt",
    `/food/${snapshot.foods[0].slug}/__next.food.$d$slug.__PAGE__.txt`,
  ];
  for (const path of paths) {
    const response = await request.get(path, { params: { _rsc: "test" } });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("text/plain");
  }
});

test("트렌드 추천 1~3위는 첫 화면에서 선택할 수 있고 사진과 출처 영상이 바뀐다", async ({ page }, info) => {
  const foods = snapshot.foods.slice(0, 3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>YouTube 플레이어 자리</p>" }));
  await page.goto("/");
  const board = page.getByRole("region", { name: "트렌드 추천 순위" });
  const preview = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const ranks = board.getByRole("button");
  await expect(ranks).toHaveCount(2);
  const photoBox = (await preview.locator("figure").boundingBox())!;
  for (const label of ["이전 추천 음식", "다음 추천 음식"]) {
    const box = (await page.getByRole("button", { name: label, exact: true }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height / 2).toBeCloseTo(photoBox.y + photoBox.height / 2, 0);
  }
  await page.screenshot({ path: `test-results/content/posters-${info.project.name}.png`, animations: "disabled" });
  const next = page.getByRole("button", { name: "다음 추천 음식", exact: true });
  await next.focus();
  await next.press("Enter");
  await expect(next).toBeFocused();
  await expect(preview.getByRole("heading", { name: foods[1].name, exact: true })).toBeVisible();
  await expect(preview.getByRole("link", { name: `${foods[1].name} 상세 보기` })).toHaveAttribute("href", `/food/${foods[1].slug}`);
  await expect(page.locator("iframe")).toHaveCount(0);

  const rankedWithVideo = foods.findIndex((food) => food.videoId || food.sources.some(({ url }) => parseYouTubeId(url)));
  if (rankedWithVideo !== -1) {
    if (rankedWithVideo !== 1) await board.getByRole("button", { name: new RegExp(`^${rankedWithVideo + 1}위 `) }).click();
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

test("순위 표시와 사진·설명, 목록 결과, 상세 화면이 동작에 맞춰 전환된다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const board = page.getByRole("region", { name: "트렌드 추천 순위" });
  const ranks = board.getByRole("button");
  const preview = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const food = snapshot.foods[1];
  await ranks.filter({ hasText: food.name }).click();
  await expect(preview.getByRole("heading", { name: food.name })).toHaveCSS("animation-name", "content-in");
  await expect(preview.getByText(/^(다시 보는 유행|오늘 살펴볼 음식)/)).toHaveCSS("animation-name", "content-in");
  await expect(preview.getByTestId("feature-description")).toHaveCSS("animation-name", "content-in");
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
  const category = page.getByRole("navigation", { name: "카테고리" }).getByRole("button", { name: /^자취 요리/ });
  await category.click();
  await expect(category.getByText("자취 요리")).toHaveCSS("animation-name", "content-in");
  const resultTitle = page.getByRole("heading", { name: "자취 요리", exact: true });
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
    await expect(heading).toHaveText(snapshot.foods[0].name);
    const next = page.getByRole("button", { name: "다음 추천 음식", exact: true });
    await next.scrollIntoViewIfNeeded();
    for (const index of [1, 2, 0]) {
      await next.click();
      await expect(next).toBeInViewport({ ratio: 1 });
      await expect(heading).toHaveText(snapshot.foods[index].name);
      await expect(heading).toHaveCSS("animation-name", "none");
      await expect(detail).toHaveAttribute("href", `/food/${snapshot.foods[index].slug}`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
});

test("대표 포스터는 둥근 모서리의 큰 사진을 원본 비율로 보여준다", async ({ page }, info) => {
  const food = snapshot.foods[0];
  await page.goto("/");
  const feature = page.getByRole("region", { name: "오늘의 음식", exact: true });
  const photo = feature.getByRole("link", { name: `${food.name} 상세 보기`, exact: true });
  await expect(photo).toHaveAttribute("href", `/food/${food.slug}`);
  const image = photo.getByRole("img");
  await image.evaluate((img: HTMLImageElement) => img.decode());
  await expect(image).toHaveCSS("object-fit", "contain");
  await expect(image).toHaveCSS("object-position", "50% 50%");
  await expect(photo.locator("img")).toHaveCount(1);
  const dimensions = (await image.boundingBox())!;
  const frame = (await feature.locator("figure").boundingBox())!;
  expect(dimensions.width).toBeGreaterThanOrEqual(frame.width * 0.95);
  expect(dimensions.width).toBeGreaterThan(info.project.name === "desktop" ? 500 : 275);
  const originalRatio = await image.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight);
  expect(dimensions.width / dimensions.height).toBeCloseTo(originalRatio, 2);
  await expect(image).toHaveCSS("border-top-left-radius", info.project.name === "desktop" ? "20px" : "16px");
  if (info.project.name === "desktop") {
    const carousel = (await page.locator(".home-poster-carousel").boundingBox())!;
    for (const caption of await page.locator(".home-poster-side-caption").all()) {
      const box = (await caption.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(carousel.x);
      expect(box.x + box.width).toBeLessThanOrEqual(carousel.x + carousel.width);
    }
  }
  await page.screenshot({ path: `test-results/content/hero-poster-${info.project.name}.png` });
  await image.click({ position: { x: 8, y: 8 } });
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
  await expect(feature.getByTestId("feature-description")).toHaveText((snapshot.foods[0].history?.note ?? snapshot.foods[0].why).split(/(?<=[.!?])\s+/)[0]);
  expect(await feature.getByTestId("feature-description").evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await expect(page.getByLabel("추천과 출처 안내")).not.toHaveAttribute("open");
  await expect(page.getByRole("link", { name: /재료 \d+개 담기|레시피 보기/ })).toHaveCount(0);
  if (snapshot.recommendation?.basis === "rotation" && snapshot.foods[0].history) await expect(feature.getByText(/^다시 보는 유행/)).toBeVisible();
  await expect(page.getByRole("link", { name: "음식 목록", exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: `test-results/content/discovery-home-${info.project.name}.png` });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const notes = page.getByLabel("추천과 출처 안내");
  await notes.locator("summary").focus();
  await notes.locator("summary").press("Enter");
  await expect(notes.getByText(new RegExp(`출처 확인 ${snapshot.foods[0].checkedAt ?? snapshot.checkedAt}`))).toBeVisible();
  await notes.locator("summary").press("Enter");
  await expect(notes).not.toHaveAttribute("open");
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  const collections = page.getByRole("navigation", { name: "음식 모음", exact: true });
  await collections.getByRole("button", { name: "유행 기록", exact: true }).click();
  const trends = snapshot.foods.filter((food) => food.history?.years.length || food.kind === "discovery");
  await expect(page.locator("#list li h3")).toHaveText(trends.map((food) => food.name));
  await expect(page.getByRole("navigation", { name: "카테고리", exact: true }).getByRole("button", { name: /^전체/ })).toHaveText(`전체${trends.length}`);
  await expect(page).toHaveURL(/collection=trends/);
  await page.reload();
  await expect(collections.getByRole("button", { name: "유행 기록", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#list li h3")).toHaveText(trends.map((food) => food.name));
  await collections.getByRole("button", { name: "일상 레시피", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => !food.history?.years.length && (!food.kind || food.kind === "recipe")).map((food) => food.name));
  await expect(page).toHaveURL(/collection=everyday/);
  await page.goBack();
  await expect(page.locator("#list li h3")).toHaveText(trends.map((food) => food.name));
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveCount(snapshot.foods.length - 1);
  await page.screenshot({ path: `test-results/content/discovery-feed-${info.project.name}.png` });
  await page.getByRole("searchbox").fill("편의점까지");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(snapshot.foods.filter((food) => food.name.includes("편의점까지") || food.why.includes("편의점까지") || food.history?.note.includes("편의점까지") || food.ingredients.some((ingredient) => ingredient.name.includes("편의점까지"))).map((food) => food.name));
  await page.goto("/?collection=unknown");
  await expect(collections.getByRole("button", { name: "전체 음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).not.toHaveURL(/collection=/);
  await collections.getByRole("button", { name: "유행 기록", exact: true }).click();
  await page.getByRole("button", { name: `${trends[0].name} 찜하기`, exact: true }).click();
  await collections.getByRole("button", { name: "일상 레시피", exact: true }).click();
  // 헤더의 찜은 현재 모음 밖에 저장한 음식도 보여준다.
  await page.getByRole("banner").getByRole("button", { name: "찜 1", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText([trends[0].name]);
  await expect(page).not.toHaveURL(/collection=/);
});

test("자취 요리 카테고리: 비유행 레시피만 모으고 연도·주소·상세·순위 복귀를 유지한다", async ({ page }, info) => {
  await page.goto("/");
  const original = await page.locator("#list li h3").allTextContents();
  const featureTitle = page.getByRole("region", { name: "오늘의 음식", exact: true }).getByRole("heading", { level: 2 });
  const recipes = snapshot.foods.filter((food) => !food.history?.years.length && (!food.kind || food.kind === "recipe"));
  expect(recipes.length).toBeGreaterThan(0);
  await page.goto("/?collection=trends&year=2026");
  const categories = page.getByRole("navigation", { name: "카테고리", exact: true });
  const everyday = categories.getByRole("button", { name: /^자취 요리/ });
  await expect(everyday).toHaveText(`자취 요리${recipes.length}`);
  await everyday.focus();
  await everyday.press("Enter");
  await expect(page.locator("#list li h3")).toHaveText(recipes.map((food) => food.name));
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(categories.locator('[aria-current="true"]')).toHaveCount(1);
  await expect(categories.getByRole("button", { name: /^전체/ })).toHaveText(`전체${snapshot.foods.length}`);
  await expect(page).toHaveURL(/collection=everyday/);
  await expect(page).not.toHaveURL(/year=|cat=/);
  await expect(featureTitle).toHaveText(snapshot.foods[0].name);
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "유행 연도", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await page.reload();
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#list li h3")).toHaveText(recipes.map((food) => food.name));
  await page.getByRole("link", { name: "음식 목록", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/content/everyday-category-${info.project.name}.png` });
  await page.getByRole("searchbox").fill("계란 파 라면");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator("#list li h3")).toHaveText(["계란 파 라면"]);
  await page.locator("#list").getByRole("link", { name: "음식 살펴보기", exact: true }).click();
  await expect(page.getByRole("region", { name: "재료 장바구니", exact: true })).toBeVisible();
  await page.goBack();
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "검색어 지우기", exact: true }).click();
  await categories.getByRole("button", { name: /^전체/ }).click();
  await expect(page.locator("#list li h3")).toHaveText(original);
  await expect(page).not.toHaveURL(/collection=/);
  await page.goto("/?collection=everyday&year=2024");
  await expect(everyday).toHaveAttribute("aria-current", "true");
  await expect(page).not.toHaveURL(/year=/);
  await expect(page.locator("#list li h3")).toHaveText(recipes.map((food) => food.name));
});

test("추가 자취 요리는 검색·실사·재료 분량과 일반 구매 검색을 제공한다", async ({ page }) => {
  await page.goto("/?collection=everyday&q=두부조림");
  await expect(page.locator("#list li h3")).toHaveText(["두부조림"]);
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

test("재검토 사진은 카드와 상세에 일관되게 표시하고 사진 정보를 제공한다", async ({ page }, info) => {
  for (const slug of [
    "dalgona-coffee", "egg-soup", "cream-pasta", "gamja-jorim", "eomuk-bokkeum", "jeyuk-bokkeum",
    "udon-soup", "omurice", "ube-latte", "janchi-guksu", "cucumber-muchim", "tuna-gimbap",
    "butter-garaetteok", "soy-sauce-egg-rice", "dubai-chewy-cookie",
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
    await expect(card.getByText("참고 사진", { exact: true })).toHaveCount(0);
    await card.screenshot({ path: `test-results/content/reviewed-${slug}-card-${info.project.name}.png` });
    await card.getByRole("link", { name: "음식 살펴보기", exact: true }).click();
    const detail = page.getByRole("region", { name: "음식 소개", exact: true });
    await expect(detail.getByRole("img", { name: food.alt, exact: true })).toHaveAttribute("src", source!);
    await page.getByLabel("사진 정보", { exact: true }).locator("summary").click();
    if (credit) {
      await expect(page.getByRole("link", { name: /사진 출처/ })).toHaveAttribute("href", credit.url);
      if (credit.licenseUrl) await expect(page.getByRole("link", { name: /사진 라이선스/ })).toHaveAttribute("href", credit.licenseUrl);
    } else {
      await expect(page.getByLabel("사진 정보", { exact: true }).getByText(/AI 생성 예시 ·/)).toBeVisible();
      await expect(page.getByRole("link", { name: /사진 출처/ })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (["dalgona-coffee", "egg-soup", "ube-latte", "cucumber-muchim"].includes(slug)) await page.screenshot({ path: `test-results/content/reviewed-${slug}-detail-${info.project.name}.png` });
  }
});

test("수집 콘텐츠: 전체 음식, 큐레이션 표시와 검색", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const intro = page.getByRole("main").getByRole("heading", { level: 1 });
  await expect(intro).toHaveText("유행 음식과 집밥");
  await expect(intro).toBeInViewport({ ratio: 1 });
  const feature = page.getByRole("region", { name: "오늘의 음식", exact: true });
  await expect(feature.getByRole("link", { name: "음식 살펴보기", exact: true })).toHaveAttribute("href", `/food/${snapshot.foods[0].slug}`);
  await expect(feature.locator("figcaption")).toHaveCount(0);
  await expect(feature.getByText(/^(AI 생성 예시|참고 사진)$/)).toHaveCount(0);
  await expect(feature.locator("figure img").last()).toBeVisible();
  await expect(feature.getByTestId("feature-description")).toHaveCSS("font-size", info.project.name === "desktop" ? "18px" : "16px");
  await expect(feature.getByRole("heading", { level: 2 })).toHaveText(snapshot.foods[0].name);
  const notesBox = (await page.getByLabel("추천과 출처 안내").boundingBox())!;
  const featureBox = (await feature.boundingBox())!;
  expect(notesBox.y).toBeGreaterThanOrEqual(featureBox.y + featureBox.height);
  await page.screenshot({ path: `test-results/content/intro-home-${info.project.name}.png` });
  await page.getByText("AI 안내·출처 정보", { exact: true }).click();
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(feature.getByRole("heading", { level: 2 })).toHaveText(snapshot.foods[0].name);
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
  const cards = page.locator(".food-grid > li").filter({ has: page.getByRole("heading", { level: 3 }) });
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
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
  const layout = page.getByRole("group", { name: "음식 목록 보기 방식" });
  const twoColumns = layout.getByRole("button", { name: "크게 보기" });
  const threeColumns = layout.getByRole("button", { name: "모아 보기" });
  await expect(twoColumns).toHaveAttribute("aria-pressed", "true");
  await threeColumns.press("Enter");
  await expect(threeColumns).toHaveAttribute("aria-pressed", "true");
  await expect(twoColumns).toHaveAttribute("aria-pressed", "false");
  const compactFirst = (await cards.nth(0).boundingBox())!;
  const compactThird = (await cards.nth(2).boundingBox())!;
  expect(compactThird.y).toBeCloseTo(compactFirst.y, 0);
  expect(compactThird.x).toBeGreaterThan(compactFirst.x);
  expect(compactFirst.width).toBeLessThan(first.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/content/feed-three-columns-${info.project.name}.png` });
  await twoColumns.click();
  await expect(twoColumns).toHaveAttribute("aria-pressed", "true");
  expect((await cards.nth(2).boundingBox())!.y).toBeGreaterThan((await cards.nth(0).boundingBox())!.y);

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
      expect((await introduction.boundingBox())!.height).toBeLessThan(440);
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
      if (food.slug === "crunch-27-cube" || food.image.endsWith("-natural-20261125") || food.image.endsWith("-home-20261125")) {
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
  expect(snapshot.foods.every((item) => item.image !== "pending")).toBe(true);
  await page.goto("/");
  const cards = page.locator("#list li").filter({ has: page.getByRole("heading", { level: 3 }) });
  for (const item of await cards.all()) {
    const image = item.locator("img");
    // 고정 메뉴와 맨 위로 버튼 사이에서 사진의 클릭 영역을 확인한다.
    await image.evaluate((img) => img.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const href = await item.getByRole("heading", { level: 3 }).getByRole("link").getAttribute("href");
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
