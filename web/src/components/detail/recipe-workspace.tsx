"use client";

import { useState } from "react";
import type { Food } from "@/lib/foods";
import { scaledIngredients, scaleAmount, servingLabel } from "@/data/recipe-tools";
import { IngredientCart } from "@/components/detail/ingredient-cart";
import { AdSlot } from "@/components/ad-slot";

export function RecipeWorkspace({ food }: { food: Food }) {
  const [ratio, setRatio] = useState(1);
  const recipe = !food.kind || food.kind === "recipe";
  const displayed = { ...food, ingredients: scaledIngredients(food.ingredients, ratio) };
  const unchanged = food.ingredients.filter((item) => item.amount && !scaleAmount(item.amount, ratio).scaled);
  return <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-baseline">
    <IngredientCart food={displayed}>
      {recipe && <fieldset className="rounded-xl border bg-muted p-3">
        <legend className="px-1 text-sm font-bold">재료 분량 조절</legend>
        <div className="flex flex-wrap gap-2">
          {[0.5, 1, 2].map((value) => <button key={value} type="button" aria-pressed={ratio === value} onClick={() => setRatio(value)} className="min-h-11 rounded-md border border-line-strong bg-background px-3 text-sm font-bold aria-pressed:bg-primary aria-pressed:text-primary-foreground">{servingLabel(food.servings, value)}{value === 1 ? " (기본)" : ""}</button>)}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">기본 {food.servings}. 재료 사용량만 계산해요. 구매 포장 용량과 조리 단계의 수치·시간은 원문 기준이에요.</p>
        {ratio !== 1 && <p role="status" className="mt-2 text-sm leading-relaxed">{unchanged.length ? `계산하지 않은 양: ${unchanged.map((item) => `${item.name} ${item.amount}`).join(", ")}. 원문 분량을 확인해 주세요.` : food.ingredients.every((item) => !item.amount) ? "사용량이 없는 재료는 구매 용량을 그대로 표시해요." : "계산 가능한 재료 사용량을 바꿨어요."}</p>}
      </fieldset>}
    </IngredientCart>
    <div className="flex min-w-0 flex-col gap-9">
      <section id="recipe" className="scroll-mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5 pb-2">
          <h2 className="text-2xl font-black tracking-[-0.02em]">{food.kind === "product" ? "고르고 즐기는 법" : "만드는 법"}</h2>
          <p className="text-sm text-muted-foreground">{food.steps.length}단계</p>
        </div>
        <ol className="m-0 list-none p-0">
          {food.steps.map((step, i) => <li id={`step-${i + 1}`} key={step.text} className="grid scroll-mt-6 grid-cols-[44px_minmax(0,1fr)] gap-4 border-t py-[18px]">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground"><span className="sr-only">단계 </span>{i + 1}</span>
            <div>
              <p className="text-base leading-[1.7] md:text-[17px]">{step.text}</p>
              {step.timerMinutes && <span className="mt-2.5 inline-block rounded-full bg-muted px-3 py-1 text-sm font-bold text-muted-foreground">{step.timerMinutes}분</span>}
            </div>
          </li>)}
        </ol>
        <p className="mt-2 rounded-2xl bg-muted px-[18px] py-4 text-[15px] leading-[1.7]"><b>팁</b> {food.tip}</p>
      </section>
      <AdSlot label="조리법 하단" className="h-[140px]" />
    </div>
  </div>;
}
