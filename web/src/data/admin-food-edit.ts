import { tagOptions, type Category, type FoodRecord, type Step } from "./catalog-schema.ts";

export type FoodBasicInfo = {
  name: string;
  category: Category;
  tags: string[];
  cook_minutes: number;
  cook_label: string;
  difficulty: FoodRecord["difficulty"];
  servings: string;
  change_label: string;
};
export type BasicInfoDraft = Omit<FoodBasicInfo, "cook_minutes"> & { cook_minutes: string };

export type StepDraft = { text: string; timer: string };
export type ConvenienceDraft = { place: string; desc: string };
export type IngredientDraft = { id?: number; name: string; hard: boolean; pantry: boolean; url?: string | null };
export type SavedIngredient = IngredientDraft & { id: number; position: number };
type Result<T> = { value: T; error?: never } | { error: string; value?: never };

export const takedownReasons = ["", "원작자 삭제 요청", "권리 침해 신고", "내용 오류", "기타"] as const;
export type TakedownNote = { reason: (typeof takedownReasons)[number]; memo: string };

export function cleanTakedownNote(draft: { reason: string; memo: string }): Result<TakedownNote> {
  if (!takedownReasons.some((reason) => reason === draft.reason)) return { error: "내림 사유를 목록에서 골라 주세요." };
  const memo = draft.memo.trim();
  if ([...memo].length > 200) return { error: "메모는 200자까지 적을 수 있어요." };
  return { value: { reason: draft.reason as TakedownNote["reason"], memo } };
}

export function youtubeId(input: string): Result<string | null> {
  const value = input.trim();
  if (!value) return { value: null };
  const validId = /^[A-Za-z0-9_-]{11}$/;
  if (validId.test(value)) return { value };
  const invalid = { error: "YouTube 주소나 11자 영상 ID를 적어 주세요." };
  if (!/^https?:\/\//i.test(value)) return invalid;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.host)) return invalid;
    const id = url.host === "youtu.be"
      ? url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1]
      : url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    return id && validId.test(id) ? { value: id } : invalid;
  } catch {
    return invalid;
  }
}
type IngredientFields = { name: string; hard: boolean; pantry: boolean; position: number };
type IngredientChanges = { removed: number[]; updated: { id: number; patch: IngredientFields }[]; added: IngredientFields[] };

export function cookLabelInput(label: string, minutes: number): string {
  return label === `조리 ${minutes}분` ? "" : label;
}

export function cleanBasicInfo(draft: BasicInfoDraft): Result<FoodBasicInfo> {
  const name = draft.name.trim();
  if (!name || name.length > 30) return { error: "이름을 1~30자로 적어 주세요." };
  const minutes = draft.cook_minutes.trim();
  const cook_minutes = Number(minutes);
  if (!/^\d+$/.test(minutes) || !Number.isInteger(cook_minutes) || cook_minutes < 1 || cook_minutes > 1440) {
    return { error: "조리 시간은 1~1440 사이의 분으로 적어 주세요." };
  }
  const change_label = draft.change_label.trim();
  if (!change_label) return { error: "순위 변동 문구를 적어 주세요." };
  return { value: {
    name, category: draft.category, tags: tagOptions.filter((tag) => draft.tags.includes(tag)),
    cook_minutes, cook_label: draft.cook_label.trim(), difficulty: draft.difficulty,
    servings: draft.servings.trim(), change_label,
  } };
}

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

export function convenienceDrafts(value: unknown): ConvenienceDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => item && typeof item.place === "string" && typeof item.desc === "string"
    ? [{ place: item.place, desc: item.desc }] : []);
}

export function cleanConvenience(drafts: ConvenienceDraft[]): Result<ConvenienceDraft[]> {
  if (drafts.length > 6) return { error: "사서 맛보기는 6개까지 적을 수 있어요." };
  const items: ConvenienceDraft[] = [];
  const places = new Set<string>();
  for (const draft of drafts) {
    const place = draft.place.trim();
    const desc = draft.desc.trim();
    if (!place || !desc) return { error: "파는 곳과 설명을 모두 적어 주세요. 안 쓰는 줄은 삭제해 주세요." };
    if (place.length > 30 || desc.length > 80) return { error: "파는 곳은 30자, 설명은 80자까지 적을 수 있어요." };
    if (places.has(place)) return { error: "파는 곳 이름이 겹쳐요. 하나로 합쳐 주세요." };
    places.add(place);
    items.push({ place, desc });
  }
  return { value: items };
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
