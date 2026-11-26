import { categoryOptions, tagOptions, type Category } from "./catalog-schema.ts";
import { SLUG_RE, type CandidateRow } from "./candidates.ts";
import { publicationDate, type ContentFood } from "./content.ts";

export function candidateSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** 출처를 확인한 후보를 게시 관리용 초안으로 옮긴다. */
export function candidateContent(candidate: CandidateRow, source: string, now = new Date()): ContentFood {
  const url = candidateSourceUrl(source);
  if (!url) throw new Error("확인한 출처의 HTTPS 주소를 입력해 주세요.");
  const draft = candidate.draft;
  const ingredients = draft?.ingredients ?? [];
  const steps = draft?.steps ?? [];
  const minutes = draft?.cookMinutes ?? 0;
  const recipe = !!draft?.servings?.trim() && Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 &&
    ingredients.length > 0 && ingredients.every((item) => item.name?.trim() && item.amount?.trim()) &&
    steps.length > 0 && steps.every((step) => step.text?.trim());
  const name = candidate.name.trim();
  return {
    slug: draft?.slug && draft.slug.length <= 80 && SLUG_RE.test(draft.slug) ? draft.slug : `candidate-${candidate.id}`,
    kind: recipe ? "recipe" : "discovery",
    name,
    why: draft?.why?.trim() || candidate.note.trim() || `${name} 소개와 참고 출처를 살펴보세요.`,
    summary: draft?.summary?.trim() || candidate.note.trim() || `${name}의 특징은 참고 출처에서 확인할 수 있어요.`,
    category: (categoryOptions as readonly string[]).includes(candidate.category) ? candidate.category as Category : "디저트",
    tags: (draft?.tags ?? []).filter((tag): tag is (typeof tagOptions)[number] => (tagOptions as readonly string[]).includes(tag)),
    cookMinutes: recipe ? minutes : 0,
    difficulty: draft?.difficulty ?? "쉬움",
    servings: (recipe && draft?.servings) || "음식 소개",
    image: "pending",
    alt: `${name} 대표 사진`,
    ingredients: recipe ? ingredients : [],
    steps: recipe ? steps : [],
    tip: draft?.tip?.trim() || "자세한 내용은 참고 출처를 확인해 주세요.",
    convenience: [],
    sources: [{ title: `${name} · 운영자 확인 출처`, url }],
    recipeNote: draft ? "후보의 AI 초안을 바탕으로 작성했어요." : "운영자가 확인한 출처를 바탕으로 소개해요.",
    checkedAt: publicationDate(now),
  };
}
