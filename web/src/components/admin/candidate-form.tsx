"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCandidate, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryOptions } from "@/lib/foods";

export function CandidateForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addCandidate, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 rounded-3xl border bg-background p-5 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-name">음식 이름</Label>
        <Input id="c-name" name="name" required maxLength={30} placeholder="예: 탕후루" className="h-11 text-base" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-category">종류</Label>
        <select
          id="c-category"
          name="category"
          required
          defaultValue=""
          className="h-11 rounded-lg border border-input bg-white px-3 text-base"
        >
          <option value="" disabled>
            고르세요
          </option>
          {categoryOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-note">근거 메모</Label>
        <Input id="c-note" name="note" maxLength={300} placeholder="예: 이번 주 영상 20개, 검색량 2배" className="h-11 text-base" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-source">출처 링크 (선택)</Label>
        <Input id="c-source" name="source" type="url" placeholder="https://…" className="h-11 text-base" />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "추가 중…" : "후보 추가"}
        </Button>
        <p role="status" className={state.error ? "text-sm font-bold text-destructive" : "text-sm font-bold text-success"}>
          {state.error ?? state.ok}
        </p>
      </div>
    </form>
  );
}
