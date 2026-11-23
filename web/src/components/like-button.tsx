"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIKES_KEY, useStoredSet } from "@/lib/use-stored-set";
import { track } from "@/lib/analytics";

export function LikeButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const likes = useStoredSet(LIKES_KEY);
  const on = likes.has(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${name} 찜하기`}
      onClick={(event) => {
        likes.toggle(slug);
        track("food_like", { food_slug: slug, selected: !on });
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const heart = event.currentTarget.querySelector("svg");
        heart?.getAnimations().forEach((animation) => animation.cancel());
        heart?.animate(
          [{ scale: "1" }, { scale: on ? "0.82" : "1.35", offset: 0.4 }, { scale: "1" }],
          { duration: 300, easing: "ease-out" },
        );
      }}
      className={cn(
        "motion-press flex size-11 items-center justify-center rounded-full bg-white/95 text-foreground",
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
