import type { FoodRecord, Ingredient } from "./catalog-schema.ts";

// 상세 재료 체크리스트와 동일한 이름을 써서 두 화면의 보유 상태를 공유한다.
export const ingredientName = (name: string) => name.replace(/\s[\d.]+\s?(g|kg|ml|매|개|개입|구|장|단).*$/, "").trim();

export function ingredientOwned(item: Ingredient, pantry: readonly string[], need: readonly string[]) {
  const name = ingredientName(item.name);
  return need.includes(name) ? false : pantry.includes(name) || !!item.pantry;
}

export function pantryMatch(food: Pick<FoodRecord, "kind" | "ingredients">, pantry: readonly string[], need: readonly string[]) {
  if (food.kind === "product" || food.kind === "discovery" || !food.ingredients.length) return null;
  const missing = food.ingredients.filter((item) => !ingredientOwned(item, pantry, need));
  return { missing, have: food.ingredients.length - missing.length, total: food.ingredients.length };
}

// 숫자+단위 전체가 명확한 양만 계산한다. 제품명·괄호·복합 수량은 원문을 보존한다.
export function scaleAmount(amount: string | undefined, ratio: number): { text: string; scaled: boolean } {
  if (!amount || ratio === 1) return { text: amount ?? "", scaled: false };
  if (!Number.isFinite(ratio) || ratio <= 0) return { text: amount, scaled: false };
  const match = amount.match(/^(약\s*)?(\d+(?:\.\d+)?|\d+\/\d+)(?:\s*([~～–-])\s*(\d+(?:\.\d+)?|\d+\/\d+))?\s*(kg|g|ml|mL|L|l|큰술|작은술|컵|개|장|줄|봉|인분)$/);
  if (!match) return { text: amount, scaled: false };
  const number = (value: string) => value.includes("/") ? Number(value.split("/")[0]) / Number(value.split("/")[1]) : Number(value);
  const values = [number(match[2]), ...(match[4] ? [number(match[4])] : [])];
  if (values.some((value) => !Number.isFinite(value))) return { text: amount, scaled: false };
  const scaled = values.map((value) => Number((value * ratio).toFixed(4)));
  if (scaled.some((value, index) => value === 0 && values[index] !== 0)) return { text: amount, scaled: false };
  const result = scaled.join(match[3] ?? "");
  return { text: `${match[1] ?? ""}${result}${match[5]}`, scaled: true };
}

export const scaledIngredients = (ingredients: Ingredient[], ratio: number) => ingredients.map((item) => ({ ...item, amount: scaleAmount(item.amount, ratio).text || undefined }));

export function servingLabel(servings: string, ratio: number) {
  const people = servings.match(/^(\d+(?:\.\d+)?)인분$/);
  return people ? `${Number((Number(people[1]) * ratio).toFixed(2))}인분` : `${ratio}배 분량`;
}
