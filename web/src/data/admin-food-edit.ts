import type { Step } from "./catalog-schema.ts";

export type StepDraft = { text: string; timer: string };
export type IngredientDraft = { id?: number; name: string; hard: boolean; pantry: boolean; url?: string | null };
export type SavedIngredient = IngredientDraft & { id: number; position: number };
type Result<T> = { value: T; error?: never } | { error: string; value?: never };
type IngredientFields = { name: string; hard: boolean; pantry: boolean; position: number };
type IngredientChanges = { removed: number[]; updated: { id: number; patch: IngredientFields }[]; added: IngredientFields[] };

export function cleanSteps(drafts: StepDraft[]): Result<Step[]> {
  if (!drafts.length) return { error: "조리 단계를 하나 이상 적어 주세요." };
  const steps: Step[] = [];
  for (const draft of drafts) {
    const text = draft.text.trim();
    if (!text) return { error: "비어 있는 단계가 있어요. 내용을 적거나 삭제해 주세요." };
    const timer = draft.timer.trim();
    const minutes = Number(timer);
    if (timer && (!/^\d+$/.test(timer) || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) {
      return { error: "타이머는 1~1440 사이의 분으로 적어 주세요." };
    }
    steps.push(timer ? { text, timerMinutes: minutes } : { text });
  }
  return { value: steps };
}

export function ingredientChanges(original: SavedIngredient[], drafts: IngredientDraft[]): Result<IngredientChanges> {
  if (!drafts.length) return { error: "재료를 하나 이상 적어 주세요." };
  const names = new Set<string>();
  const changes: IngredientChanges = { removed: original.filter((item) => !drafts.some((d) => d.id === item.id)).map((item) => item.id), updated: [], added: [] };
  for (const [position, draft] of drafts.entries()) {
    const name = draft.name.trim();
    if (!name) return { error: "이름이 비어 있는 재료가 있어요." };
    if (names.has(name)) return { error: `같은 이름의 재료가 두 번 있어요: ${name}` };
    names.add(name);
    const patch = { name, hard: draft.hard, pantry: draft.pantry, position };
    if (draft.id === undefined) changes.added.push(patch);
    else changes.updated.push({ id: draft.id, patch });
  }
  return { value: changes };
}

export function photoChanges(previousImage: string, image: string, description: string): Result<{ image: string; alt: string; hero_image?: null; hero_alt?: null }> {
  const alt = description.trim();
  if (!alt) return { error: "사진 설명을 적어 주세요." };
  return { value: previousImage === image ? { image, alt } : { image, alt, hero_image: null, hero_alt: null } };
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const result = [...items];
  const target = index + direction;
  if (index < 0 || index >= result.length || target < 0 || target >= result.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
