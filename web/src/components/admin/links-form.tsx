"use client";

import { useActionState } from "react";
import { type FormState, saveLinks } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { name: string; url: string; price?: number; pantry: boolean };

export function LinksForm({ slug, name, ingredients }: { slug: string; name: string; ingredients: Row[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLinks.bind(null, slug), {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border bg-background p-5">
      <h2 className="text-xl font-black">{name}</h2>
      {ingredients.map((ing, i) => (
        <fieldset key={ing.name} className="grid gap-2 rounded-xl bg-muted p-3 md:grid-cols-[minmax(0,1fr)_140px]">
          <legend className="sr-only">{ing.name}</legend>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${slug}-url-${i}`}>
              {ing.name}
              {ing.pantry && <span className="text-xs font-normal text-muted-foreground">(기본: 집에 있어요)</span>}
            </Label>
            <Input
              id={`${slug}-url-${i}`}
              name={`url-${i}`}
              type="url"
              inputMode="url"
              defaultValue={ing.url}
              placeholder="https://link.coupang.com/a/…"
              className="h-11 bg-white text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${slug}-price-${i}`}>참고 가격(원)</Label>
            <Input
              id={`${slug}-price-${i}`}
              name={`price-${i}`}
              inputMode="numeric"
              defaultValue={ing.price ?? ""}
              placeholder="예: 8500"
              className="h-11 bg-white text-base tabular-nums"
            />
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        <p role="status" className={state.error ? "text-sm font-bold text-destructive" : "text-sm font-bold text-success"}>
          {state.error ?? state.ok}
        </p>
      </div>
    </form>
  );
}
