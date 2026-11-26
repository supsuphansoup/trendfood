import type { FoodRecord } from "./catalog-schema.ts";
import { COUPANG_URL_RE } from "./candidates.ts";
import { contentToRecords, parseContent, type ContentFood, type ContentSnapshot } from "./content.ts";
import { uploadedPhotoIds } from "./photos.ts";

export type ContentEdit = Partial<Pick<ContentFood,
  "name" | "category" | "tags" | "cookMinutes" | "difficulty" | "servings" |
  "why" | "summary" | "tip" | "image" | "alt" | "videoId" | "ingredients" | "steps" | "convenience"
>> & {
  hidden?: boolean;
  draft?: boolean;
  cookLabel?: string;
  change?: string;
  ingredientLinks?: Record<string, string | null>;
};

export type ContentEdits = { foods: Record<string, ContentEdit>; order?: string[] };
export type ContentEditState = { revision: number; draft: ContentEdits; published: ContentEdits };

const foodFields = [
  "name", "category", "tags", "cookMinutes", "difficulty", "servings", "why", "summary", "tip",
  "image", "alt", "videoId", "ingredients", "steps", "convenience",
] as const satisfies readonly (keyof ContentEdit)[];
const editFields = new Set<string>([...foodFields, "hidden", "draft", "cookLabel", "change", "ingredientLinks"]);
const validSlug = (slug: string) => slug.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function parseContentEdits(value: unknown): ContentEdits {
  if (!isObject(value) || !isObject(value.foods) || Object.keys(value).some((key) => key !== "foods" && key !== "order")) {
    throw new Error("게시 관리 데이터 형식이 잘못됐어요.");
  }
  if (value.order !== undefined && (!Array.isArray(value.order) || value.order.length > 1000 ||
    value.order.some((slug) => typeof slug !== "string" || !validSlug(slug)) ||
    new Set(value.order).size !== value.order.length)) throw new Error("음식 순서가 잘못됐어요.");
  for (const [slug, edit] of Object.entries(value.foods)) {
    if (!validSlug(slug) || !isObject(edit) || Object.keys(edit).some((key) => !editFields.has(key)) ||
      [edit.hidden, edit.draft].some((flag) => flag !== undefined && typeof flag !== "boolean") ||
      (edit.cookLabel !== undefined && (typeof edit.cookLabel !== "string" || edit.cookLabel.length > 40)) ||
      (edit.change !== undefined && (typeof edit.change !== "string" || !edit.change.trim() || edit.change.length > 30)) ||
      (edit.ingredientLinks !== undefined && (!isObject(edit.ingredientLinks) || Object.entries(edit.ingredientLinks)
        .some(([name, url]) => !name.trim() || name.length > 60 || (url !== null &&
          (typeof url !== "string" || url.length > 2000 || !COUPANG_URL_RE.test(url)))))) ||
      (edit.videoId !== undefined && edit.videoId !== null &&
        (typeof edit.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(edit.videoId)))) {
      throw new Error(`게시 관리 값이 잘못됐어요 (${slug}).`);
    }
  }
  return value as ContentEdits;
}

export function contentEditUploads(edits: ContentEdits): string[] {
  return uploadedPhotoIds(Object.values(edits.foods).map((edit) => edit.image));
}

export function getContentEdit(edits: ContentEdits, slug: string): ContentEdit | undefined {
  return Object.hasOwn(edits.foods, slug) ? edits.foods[slug] : undefined;
}

function mergeFood(food: ContentFood, edit: ContentEdit | undefined): ContentFood {
  if (!edit) return food;
  const patch = Object.fromEntries(foodFields.filter((key) => Object.hasOwn(edit, key)).map((key) => [key, edit[key]]));
  const merged = { ...food, ...patch };
  if (edit.ingredientLinks && Array.isArray(merged.ingredients)) {
    const links = edit.ingredientLinks;
    merged.ingredients = merged.ingredients.map((ingredient) => {
      if (!ingredient || !Object.hasOwn(links, ingredient.name)) return ingredient;
      const { url: original, ...fields } = ingredient;
      const url = links[ingredient.name] ?? undefined;
      return url === original ? ingredient : { ...fields, ...(url ? { url } : {}) };
    });
  }
  if (edit.image !== undefined && edit.image !== food.image) {
    delete merged.heroImage;
    delete merged.heroAlt;
  }
  return merged;
}

export const isPublicContent = (edit: ContentEdit | undefined) => !edit?.hidden && !edit?.draft;

/** 명시적으로 옮긴 주소들만 순서를 바꾼다. 새로 수집된 음식은 원래 위치에 둔다. */
export function orderContent<T extends { slug: string }>(foods: T[], order: string[] = []): T[] {
  const bySlug = new Map(foods.map((food) => [food.slug, food]));
  const reordered = order.flatMap((slug) => bySlug.has(slug) ? [bySlug.get(slug)!] : []);
  const moved = new Set(order);
  let index = 0;
  return foods.map((food) => moved.has(food.slug) ? reordered[index++] : food);
}

export function applyContentEdits(snapshot: ContentSnapshot, edits: ContentEdits, uploads: readonly string[] = []): ContentSnapshot {
  const foods = snapshot.foods.map((food) => mergeFood(food, getContentEdit(edits, food.slug)));
  return parseContent({ ...snapshot, foods }, false, uploads);
}

export function editedContentRecords(snapshot: ContentSnapshot, edits: ContentEdits, uploads: readonly string[] = []): FoodRecord[] {
  const merged = applyContentEdits(snapshot, edits, uploads);
  const foods = orderContent(merged.foods, edits.order).filter((food) => isPublicContent(getContentEdit(edits, food.slug)));
  if (!foods.length) throw new Error("게시 중인 음식을 하나 이상 남겨 주세요.");
  const recommendation = merged.recommendation;
  const adjusted = recommendation?.basis === "new" && !recommendation.newSlugs.includes(foods[0].slug)
    ? { ...recommendation, basis: "rotation" as const }
    : recommendation;
  return contentToRecords({ ...merged, foods, recommendation: adjusted }).map((record) => {
    const edit = getContentEdit(edits, record.slug);
    return {
      ...record,
      cookLabel: record.kind !== "discovery" && edit?.cookLabel ? edit.cookLabel : record.cookLabel,
      change: edit?.change ?? record.change,
      ...(edit?.videoId === null ? { hideSourceVideo: true } : {}),
    };
  });
}
