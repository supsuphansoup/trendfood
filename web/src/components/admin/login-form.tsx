"use client";

import { useActionState } from "react";
import { type FormState, login } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl border bg-background p-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="h-12 text-base"
        />
      </div>
      {state.error && (
        <p id="login-error" role="alert" className="text-sm font-bold text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} size="xl">
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
