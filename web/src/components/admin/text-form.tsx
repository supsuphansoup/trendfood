"use client";

import { useActionState } from "react";
import { type FormState, saveText } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { slug: string; name: string; why: string; summary: string };

export function TextForm({ slug, name, why, summary }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveText.bind(null, slug), {});
  const id = (k: string) => `${slug}-${k}`;
  return (
    <form action={action} className="mt-2 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("name")}>음식 이름</Label>
        <Input id={id("name")} name="name" defaultValue={name} maxLength={30} required className="h-11 text-base" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("why")}>카드 설명 (한두 문장)</Label>
        <Textarea id={id("why")} name="why" defaultValue={why} maxLength={200} rows={2} className="text-base" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("summary")}>왜 뜨는지 (AI 요약 검수본)</Label>
        <Textarea id={id("summary")} name="summary" defaultValue={summary} maxLength={600} rows={4} className="text-base" />
      </div>
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
