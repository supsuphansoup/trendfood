import type { Product } from "./coupang-automation.ts";

type Quantity = { unit: "g" | "ml" | "count"; value: number };
export type IngredientContext = { food: string; ingredient: string; amount: string };
const normalized = (text: string) => text.normalize("NFKC").toLowerCase();
const measures = (text: string) => [...text.matchAll(/(?<![\d./])(\d+(?:\.\d+)?(?:\/\d+)?)\s*(kg|ml|g|l|개입|개|구|알|장|매|봉지|봉|팩)(?![a-z])/gu)].map((match): Quantity => {
  const [numerator, denominator = "1"] = match[1].split("/");
  const unit = match[2];
  return { unit: /^(kg|g)$/.test(unit) ? "g" : /^(ml|l)$/.test(unit) ? "ml" : "count", value: Number(numerator) / Number(denominator) * (/^(kg|l)$/.test(unit) ? 1000 : 1) };
});

/** 서로 다른 단위·범위·추가 사용량을 추측해 환산하지 않는다. */
export function recipeQuantity(amount: string | undefined): Quantity | null {
  const text = normalized(amount ?? "");
  if (/[~〜～]|\d\s*-\s*\d|\d,\d|약간|충분히|적당량/.test(text)) return null;
  const quantities = measures(text);
  const weighted = quantities.filter((quantity) => quantity.unit !== "count");
  const selected = weighted.length ? weighted : quantities;
  if (!selected.length || selected.some((quantity) => !Number.isFinite(quantity.value) || quantity.value <= 0 || quantity.unit !== selected[0].unit)) return null;
  if (selected.length > 1 && !text.includes("+")) return null;
  return { unit: selected[0].unit, value: selected.reduce((sum, quantity) => sum + quantity.value, 0) };
}

/** 상품 제목의 단위 용량과 묶음 수량을 곱한다. 여러 중량·옵션·혼합 세트는 보류한다. */
export function packageQuantity(title: string): Quantity | null {
  let text = normalized(title).replace(/\s+-\s+[^|]+\|\s*쿠팡\s*$/u, "");
  if (/[+~〜～]|\d\s*-\s*\d|\d,\d|업소|대용량|벌크|도매|박스|세트|묶음|혼합|랜덤|골라|옵션|선택|\d\s*종/.test(text)) return null;
  text = text.replace(/(?<![\d.])(\d+)\s*[x×*]\s*(?=\d+(?:\.\d+)?\s*(?:kg|ml|g|l)(?![a-z]))/g, "$1개 ")
    .replace(/[x×*]\s*(\d+)\s*(?=$|[, )-])/g, " $1개");
  const quantities = measures(text);
  if (!quantities.length || quantities.some((quantity) => !Number.isFinite(quantity.value) || quantity.value <= 0)) return null;
  const weighted = quantities.filter((quantity) => quantity.unit !== "count");
  if (weighted.length > 1) return null;
  if (weighted.length && /개입|매입/.test(text)) return null;
  const count = quantities.filter((quantity) => quantity.unit === "count").reduce((total, quantity) => total * quantity.value, 1);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  const quantity = weighted[0] ?? { unit: "count", value: 1 };
  return { unit: quantity.unit, value: quantity.value * count };
}

/** 필요량 이상인 최소 포장을 우선한다. 가정용 상한을 넘거나 단위가 다르면 후보에서 제외한다. */
export function suitableProducts(products: Product[], amount: string | undefined): Product[] {
  const needed = recipeQuantity(amount);
  if (!needed) return [];
  const ceiling = Math.max(needed.unit === "count" ? 10 : 500, needed.value * 3);
  return products.map((product) => ({ product, quantity: packageQuantity(product.name) }))
    .filter((item) => item.quantity && item.quantity.unit === needed.unit && item.quantity.value >= needed.value && item.quantity.value <= ceiling)
    .sort((a, b) => a.quantity!.value - b.quantity!.value).map((item) => item.product);
}
