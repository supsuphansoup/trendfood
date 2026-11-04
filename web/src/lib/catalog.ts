import "server-only";

import { cacheTag } from "next/cache";
import { type Food, foods } from "@/lib/foods";
import { readStore } from "@/lib/store";

export const CATALOG_TAG = "catalog";

export type CatalogFood = Food & { hidden: boolean };

/** 기본 데이터(foods.ts) + 관리자 수정(store)을 합친 전체 목록. 관리자 저장 시 updateTag(CATALOG_TAG) */
export async function getCatalog(): Promise<CatalogFood[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  const store = await readStore();

  const position = (slug: string) => {
    const i = store.order.indexOf(slug);
    return i === -1 ? 1000 + foods.findIndex((f) => f.slug === slug) : i;
  };

  const merged = [...foods]
    .sort((a, b) => position(a.slug) - position(b.slug))
    .map((f): CatalogFood => {
      const edit = store.edits[f.slug] ?? {};
      const links = store.links[f.slug] ?? {};
      return {
        ...f,
        name: edit.name || f.name,
        why: edit.why || f.why,
        summary: edit.summary || f.summary,
        hidden: store.hidden.includes(f.slug),
        ingredients: f.ingredients.map((ing) => ({
          ...ing,
          url: links[ing.name]?.url || undefined,
          price: links[ing.name]?.price ?? ing.price,
        })),
      };
    });

  // 공개된 음식만 1위부터 다시 번호를 매긴다
  let rank = 0;
  return merged.map((f) => (f.hidden ? { ...f, rank: 0 } : { ...f, rank: ++rank }));
}

export async function getPublishedFoods() {
  return (await getCatalog()).filter((f) => !f.hidden);
}

export async function getPublishedFood(slug: string) {
  return (await getPublishedFoods()).find((f) => f.slug === slug);
}
