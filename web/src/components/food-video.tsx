"use client";

import { Play, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function FoodVideo({ name, videoId, variant = "filled" }: { name: string; videoId: string; variant?: "filled" | "outline" }) {
  const title = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" onClick={() => {
      dialog.current?.showModal();
      setOpen(true);
    }} className={cn(
      "motion-press inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-meta font-bold focus-visible:outline-offset-2 max-[360px]:px-2.5 md:min-h-12 md:px-4",
      variant === "outline" ? "border border-line-strong bg-card text-foreground hover:border-primary hover:text-destructive" : "bg-foreground text-background hover:bg-destructive focus-visible:outline-current",
    )}>
      <Play className="size-4" aria-hidden /> 영상 보기
    </button>
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onClose={() => { setOpen(false); trigger.current?.focus(); }}
      className="motion-dialog fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-auto rounded-feature border bg-background text-foreground backdrop:bg-foreground/70"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-2 md:px-5">
        <h2 id={title} className="text-lg leading-tight font-bold">{name} 원본 영상</h2>
        <button type="button" autoFocus onClick={() => dialog.current?.close()} className="motion-press grid size-11 shrink-0 place-items-center rounded-md border" aria-label="영상 닫기">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {open && <div className="space-y-2 p-3 md:p-5">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1`}
          title={`${name} 원본 영상`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="block aspect-video min-h-[200px] w-full rounded-md border-0 bg-foreground"
        />
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-accent underline underline-offset-4">
          YouTube에서 보기
        </a>
      </div>}
    </dialog>
  </>;
}
