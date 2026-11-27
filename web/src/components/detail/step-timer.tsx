"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCookDuration } from "@/data/cook-duration";

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function StepTimer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(remaining);
      if (!remaining) setRunning(false);
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  const base =
    "mt-2.5 inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-primary bg-white px-3.5 text-sm font-bold text-foreground";

  if (left === null) {
    return (
      <button
        type="button"
        className={base}
        onClick={() => {
          setLeft(minutes * 60);
          deadline.current = Date.now() + minutes * 60_000;
          setRunning(true);
        }}
      >
        <Timer className="size-[18px]" aria-hidden />
        타이머 {formatCookDuration(minutes)}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span role="timer" aria-live={left === 0 ? "assertive" : "off"} className={`${base} tabular-nums`}>
        <Timer className="size-[18px]" aria-hidden />
        {left === 0 ? "다 됐어요!" : clock(left)}
      </span>
      {left > 0 && (
        <button
          type="button"
          className={base}
          onClick={() => {
            if (running) setLeft(Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000)));
            else deadline.current = Date.now() + (left ?? 0) * 1000;
            setRunning(!running);
          }}
          aria-label={running ? "타이머 멈춤" : "타이머 계속"}
        >
          {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      )}
      <button
        type="button"
        className={base}
        onClick={() => {
          setLeft(null);
          setRunning(false);
          deadline.current = null;
        }}
        aria-label="타이머 처음으로"
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>
    </div>
  );
}
