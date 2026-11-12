import type { CandidateDraft } from "../../src/data/candidates.ts";
import type { Category } from "../../src/data/catalog-schema.ts";
import { parseContent, type ContentFood, type ContentSnapshot } from "../../src/data/content.ts";
import type { Video } from "./sources.ts";

export type ContentCandidate = {
  name: string;
  category: Category;
  draft: CandidateDraft | null;
  sources: Video[];
};

/** 실제 영상 출처와 완성된 AI 초안만 내보낸다. 반영 전 검수할 draft 파일이다. */
export function draftSnapshot(candidates: ContentCandidate[], checkedAt = new Date().toISOString().slice(0, 10)): ContentSnapshot {
  const foods: ContentFood[] = [];
  for (const candidate of candidates) {
    const d = candidate.draft;
    const sources = candidate.sources.filter((s) => /^[a-zA-Z0-9_-]{11}$/.test(s.id));
    if (!d || !sources.length) continue;
    foods.push({
      slug: d.slug,
      name: candidate.name,
      why: d.why ?? "",
      summary: d.summary ?? "",
      category: candidate.category,
      tags: d.tags ?? [],
      cookMinutes: d.cookMinutes ?? 0,
      difficulty: d.difficulty ?? "쉬움",
      servings: d.servings ?? "",
      ingredients: d.ingredients ?? [],
      steps: (d.steps ?? []).map(({ text, timerMinutes }) => ({ text, ...(timerMinutes && timerMinutes > 0 ? { timerMinutes } : {}) })),
      tip: d.tip ?? "",
      image: "pending",
      alt: `${candidate.name} 사진 준비 중`,
      convenience: [],
      sources: sources.map((s) => ({ title: s.title, url: `https://www.youtube.com/watch?v=${s.id}` })),
      recipeNote: "영상 제목과 검색량을 바탕으로 AI가 작성한 초안이에요. 조리법·분량·시간은 가정용 제안이며, 원본 영상에서 확인된 조리법이 아니에요. 직접 조리 검증은 하지 않았어요.",
    });
  }
  return parseContent({ version: 1, status: "draft", checkedAt, foods }, true);
}
