"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useState } from "react";

const label = (min: number) => (min >= 60 ? `${min / 60}시간` : `${min}분`);
const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function StepTimer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s === null || s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
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
          setRunning(true);
        }}
      >
        <Timer className="size-[18px]" aria-hidden />
        타이머 {label(minutes)}
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
          onClick={() => setRunning((r) => !r)}
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
        }}
        aria-label="타이머 처음으로"
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>
    </div>
  );
}
