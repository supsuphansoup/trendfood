"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "링크를 복사했어요" : "공유하기"}
      onClick={async () => {
        const url = window.location.href.split("#")[0];
        try {
          if (navigator.share) {
            await navigator.share({ title: `${title} | 트렌드푸드`, url });
            return;
          }
        } catch {
          return; // 사용자가 공유 창을 닫음
        }
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      className="flex size-[46px] items-center justify-center rounded-full bg-white/95 text-foreground"
    >
      {copied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
    </button>
  );
}
