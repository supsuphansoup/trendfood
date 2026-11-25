import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentSnapshot } from "../src/data/content.ts";
import { recentlyPublished } from "../src/data/freshness.ts";
import { scaleAmount, servingLabel } from "../src/data/recipe-tools.ts";

const snapshot = JSON.parse(readFileSync(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;

test("최근 발견은 첫 공개일만 사용하고 기존 출처 확인일을 신규로 바꾸지 않는다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "최근 발견", exact: true }).click();
  const recent = snapshot.foods
    .filter((food) => (food.history?.years.length || food.kind === "discovery") && recentlyPublished(food, new Date().toISOString().slice(0, 10)))
    .sort((a, b) => Math.max(0, ...(b.history?.years ?? [])) - Math.max(0, ...(a.history?.years ?? [])));
  await expect(page.locator("#list li h3")).toHaveText(recent.map((food) => food.name));
  if (!recent.length) await expect(page.getByText("최근 30일에 등록일이 확인된 새 음식이 없어요. 유행 음식과 유행 기록을 둘러보세요.")).toBeVisible();
  await expect(page.getByRole("button", { name: `전체 ${recent.length}`, exact: true })).toBeVisible();
});

test("공개 레시피 분량·복사·원문 단계와 구매 포장 정보는 구분한다", async ({ page, context }, info) => {
  const food = snapshot.foods.find((food) => (!food.kind || food.kind === "recipe") && food.ingredients.some((item) => scaleAmount(item.amount, 2).scaled))!;
  const ingredient = food.ingredients.find((item) => scaleAmount(item.amount, 2).scaled)!;
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/food/${food.slug}`);
  const cart = page.locator("#cart");
  const steps = await page.locator("#recipe ol").innerText();
  const links = await cart.getByRole("link").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  await cart.getByRole("button", { name: servingLabel(food.servings, 2), exact: true }).click();
  await expect(cart.getByText(`사용량 ${scaleAmount(ingredient.amount, 2).text}`, { exact: true }).first()).toBeVisible();
  expect(await page.locator("#recipe ol").innerText()).toBe(steps);
  expect(await cart.getByRole("link").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))).toEqual(links);
  await cart.getByRole("button", { name: "재료 목록 복사", exact: true }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  // 보유한 기본 양념은 복사 목록에서 빠지므로 일반 재료의 계산값을 검증한다.
  const nonPantry = food.ingredients.find((item) => !item.pantry && scaleAmount(item.amount, 2).scaled);
  if (nonPantry) expect(clipboard).toContain(`${nonPantry.name} ${scaleAmount(nonPantry.amount, 2).text}`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/content/servings-${info.project.name}.png`, fullPage: true });
  await cart.getByRole("button", { name: `${servingLabel(food.servings, 1)} (기본)`, exact: true }).click();
  await expect(cart.getByText(`사용량 ${ingredient.amount}`, { exact: true }).first()).toBeVisible();
});

test("완제품에는 분량 조절·요리 모드·Recipe 구조화 정보를 만들지 않는다", async ({ page }) => {
  for (const food of snapshot.foods.filter((food) => food.kind === "product" || food.kind === "discovery")) {
    await page.goto(`/food/${food.slug}`);
    await expect(page.getByRole("group", { name: "재료 분량 조절" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "요리 모드", exact: true })).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});

test("레시피마다 기본 양념 여부가 달라도 사용자가 고른 보유 상태를 함께 적용한다", async ({ page }) => {
  const recipes = [true, false].map((pantry) => snapshot.foods.find((food) => food.ingredients.some((item) => item.name === "고추장" && !!item.pantry === pantry))!);
  await page.goto("/?pantry=1");
  const region = page.getByRole("region", { name: "보유 재료로 찾기" });
  await region.getByRole("searchbox", { name: "보유 재료 검색" }).fill("고추장");
  const choice = region.getByRole("checkbox", { name: "고추장 레시피별 기본값", exact: true });
  await expect(choice).toHaveJSProperty("indeterminate", true);
  await choice.click();
  for (const recipe of recipes) {
    await page.goto(`/food/${recipe.slug}`);
    const ingredient = page.locator("#cart").getByRole("checkbox", { name: /^고추장\s/ });
    await expect(ingredient).not.toBeChecked();
  }
  await page.goto("/?pantry=1");
  await region.getByRole("searchbox", { name: "보유 재료 검색" }).fill("고추장");
  await region.getByRole("checkbox", { name: "고추장", exact: true }).uncheck();
  for (const recipe of recipes) {
    await page.goto(`/food/${recipe.slug}`);
    await expect(page.locator("#cart").getByRole("checkbox", { name: /^고추장\s/ })).toBeChecked();
  }
});
