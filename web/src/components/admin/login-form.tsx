import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ db, onSignedIn }: { db: SupabaseClient; onSignedIn: () => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError("");
    const { error } = await db.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (error) return setError("이메일이나 비밀번호가 맞지 않아요.");
    onSignedIn();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input className="h-11 text-base" id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input className="h-11 text-base" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <p id="login-error" aria-live="polite" className="min-h-6 text-sm font-bold text-destructive">
        {error}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
