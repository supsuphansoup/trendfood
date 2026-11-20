"use client";

import { useState } from "react";
import type { Food } from "@/lib/foods";
import { ingredientName } from "@/data/recipe-tools";
import { PANTRY_KEY, useStoredSet } from "@/lib/use-stored-set";

export function PantryFinder({ foods, active, onChange }: { foods: Food[]; active: boolean; onChange: (active: boolean) => void }) {
  const pantry = useStoredSet(PANTRY_KEY);
  const need = useStoredSet("tf:need");
  const [query, setQuery] = useState("");
  const grouped = new Map<string, Set<boolean>>();
  for (const item of foods.filter((food) => !food.kind || food.kind === "recipe").flatMap((food) => food.ingredients)) {
    const name = ingredientName(item.name);
    if (!grouped.has(name)) grouped.set(name, new Set());
    grouped.get(name)!.add(!!item.pantry);
  }
  const ingredients = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, "ko"));
  const visible = ingredients.filter(([name]) => !query || name.includes(query.trim()));
  return <section aria-label="보유 재료로 찾기" className="mb-5 rounded-2xl border bg-card p-4">
    <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
      <input type="checkbox" checked={active} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-primary" />
      보유 재료로 찾기
    </label>
    {active && <div className="mt-3 space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">집에 있는 재료를 고르면 부족한 재료가 적은 순서로 보여요. 기본 양념의 보유 여부는 레시피별 기본값으로 시작해요. 직접 선택하면 모든 레시피와 상세 체크리스트에 함께 적용돼요.</p>
      <label className="block text-sm font-bold">보유 재료 검색
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal" placeholder="예: 달걀" />
      </label>
      <div className="grid max-h-64 grid-cols-2 gap-x-3 overflow-auto rounded-md border bg-background p-2 sm:grid-cols-3" aria-label="보유 재료 선택">
        {visible.map(([name, defaults]) => <label key={name} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={!need.has(name) && (pantry.has(name) || defaults.size === 1 && defaults.has(true))} ref={(node) => { if (node) node.indeterminate = defaults.size > 1 && !pantry.has(name) && !need.has(name); }} onChange={(event) => { pantry.toggle(name, event.target.checked); need.toggle(name, !event.target.checked); }} className="size-5 shrink-0 accent-primary" />
          <span>{name}{defaults.size > 1 && !pantry.has(name) && !need.has(name) && <span className="block text-xs text-muted-foreground">레시피별 기본값</span>}</span>
        </label>)}
        {!visible.length && <p className="col-span-full py-3 text-sm">등록된 재료가 없어요.</p>}
      </div>
      <button type="button" className="min-h-11 text-sm font-bold underline" onClick={() => { pantry.items.forEach((name) => pantry.toggle(name, false)); need.items.forEach((name) => need.toggle(name, false)); }}>기본 양념만 보유로 초기화</button>
    </div>}
  </section>;
}
