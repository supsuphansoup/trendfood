"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIKES_KEY, useStoredSet } from "@/lib/use-stored-set";

export function LikeButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const likes = useStoredSet(LIKES_KEY);
  const on = likes.has(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${name} 찜하기`}
      onClick={() => likes.toggle(slug)}
      className={cn(
        "flex size-11 items-center justify-center rounded-full bg-white/95 text-foreground transition-colors",
        className,
      )}
    >
      <Heart className={cn("size-5", on && "fill-accent text-accent")} aria-hidden />
    </button>
  );
}

export function LikeCount({ className }: { className?: string }) {
  const likes = useStoredSet(LIKES_KEY);
  return <span className={className}>찜 {likes.items.length}</span>;
}
