import type { MetadataRoute } from "next";
import { getPublishedFoods } from "@/lib/catalog";
import { foodUrl, SITE_URL } from "@/data/seo";

export const dynamic = "force-static";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const foods = await getPublishedFoods();
  return [
    ...["", "/about", "/privacy", "/terms"].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...foods.map((food) => ({ url: foodUrl(food.slug), ...(food.editorial?.checkedAt ? { lastModified: food.editorial.checkedAt } : {}) })),
  ];
}
