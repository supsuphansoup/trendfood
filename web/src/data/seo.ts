import type { FoodRecord } from "./catalog-schema.ts";

export const SITE_URL = "https://trendfood.pages.dev";
export const foodUrl = (slug: string) => `${SITE_URL}/food/${encodeURIComponent(slug)}`;
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export function recipeJson(food: Omit<FoodRecord, "image" | "heroImage">, imageUrl?: string) {
  if (food.kind === "product" || food.kind === "discovery") return null;
  return {
    "@context": "https://schema.org", "@type": "Recipe", name: food.name,
    description: food.why, url: foodUrl(food.slug),
    ...(imageUrl ? { image: [new URL(imageUrl, SITE_URL).href] } : {}),
    ...(food.publishedAt ? { datePublished: food.publishedAt } : {}),
    ...(food.editorial?.checkedAt ? { dateModified: food.editorial.checkedAt } : {}),
    ...(food.cookMinutes > 0 && !/굳히|숙성|냉장|별도|추가|대기|휴지|식히/.test(food.cookLabel) ? { totalTime: `PT${food.cookMinutes}M` } : {}),
    recipeYield: food.servings,
    recipeIngredient: food.ingredients.map((item) => `${item.name}${item.amount ? ` ${item.amount}` : ""}`),
    recipeInstructions: food.steps.map((step, i) => ({ "@type": "HowToStep", text: step.text, url: `${foodUrl(food.slug)}#step-${i + 1}` })),
  };
}
