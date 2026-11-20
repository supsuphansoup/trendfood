"use client";

import { useEffect, useRef, useState } from "react";
import type { Food } from "@/lib/foods";
import { useStoredSet } from "@/lib/use-stored-set";
import { StepTimer } from "@/components/detail/step-timer";

function CookingDialog({ food, onClose }: { food: Food; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const completed = useStoredSet(`tf:cooking:${food.slug}`);
  const count = food.steps.filter((step) => completed.has(step.text)).length;
  const [awake, setAwake] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    if (!awake) return;
    let stopped = false;
    let lock: WakeLockSentinel | undefined;
    let pending = false;
    const acquire = async () => {
      if (stopped || pending || lock || document.visibilityState !== "visible") return;
      if (!("wakeLock" in navigator)) { setWakeStatus("이 브라우저는 화면 켜두기를 지원하지 않아요."); return; }
      pending = true;
      try {
        const result = await navigator.wakeLock.request("screen");
        if (stopped || document.visibilityState !== "visible") { await result.release(); return; }
        lock = result;
        setWakeStatus("요리 모드에서 화면을 켜두고 있어요.");
        result.addEventListener("release", () => { if (lock === result) lock = undefined; if (!stopped) setWakeStatus("화면 켜두기가 해제됐어요. 화면을 다시 열거나 설정을 껐다 켜 주세요."); });
      } catch { if (!stopped) setWakeStatus("화면 켜두기를 사용할 수 없어요. 기기의 화면 잠금 설정을 확인해 주세요."); }
      finally { pending = false; }
    };
    const visible = () => {
      if (document.visibilityState === "visible") void acquire();
      else if (lock) { const previous = lock; lock = undefined; void previous.release().catch(() => {}); }
    };
    void acquire();
    document.addEventListener("visibilitychange", visible);
    return () => { stopped = true; document.removeEventListener("visibilitychange", visible); if (lock) void lock.release().catch(() => {}); };
  }, [awake]);
  const close = () => { dialog.current?.close(); onClose(); };
  return <dialog ref={dialog} aria-labelledby="cooking-title" onCancel={(event) => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[100dvh] w-full max-w-3xl overflow-auto rounded-none border bg-background p-5 text-foreground backdrop:bg-foreground/60 md:max-h-[90dvh] md:rounded-3xl md:p-8">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background pb-3">
      <h2 id="cooking-title" className="text-2xl font-black">{food.name} · 요리 모드</h2>
      <button autoFocus type="button" onClick={close} className="min-h-11 shrink-0 rounded-md border px-4 font-bold">닫기</button>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">단계의 수치와 시간은 기본 {food.servings} 기준이에요. 타이머는 이 모드를 닫으면 종료돼요.</p>
    <p role="status" className="mt-3 font-bold">{count}/{food.steps.length}단계 완료{count === food.steps.length ? " · 요리 완료!" : ""}</p>
    <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={awake} onChange={(event) => { setAwake(event.target.checked); if (!event.target.checked) setWakeStatus(""); }} className="size-5 accent-primary" />화면 켜두기</label>
    <p role="status" className="text-sm leading-relaxed text-muted-foreground">{wakeStatus}</p>
    <ol className="mt-4 list-none p-0">
      {food.steps.map((step, i) => <li key={step.text} className="border-t py-5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-lg font-bold"><input type="checkbox" checked={completed.has(step.text)} onChange={(event) => completed.toggle(step.text, event.target.checked)} className="size-6 accent-primary" />단계 {i + 1} 완료</label>
        <p className={`mt-2 text-xl leading-relaxed md:text-2xl${completed.has(step.text) ? " text-muted-foreground" : ""}`}>{step.text}</p>
        {step.timerMinutes && <StepTimer minutes={step.timerMinutes} />}
      </li>)}
    </ol>
    <button type="button" className="min-h-11 rounded-md border px-4 font-bold" onClick={() => food.steps.forEach((step) => completed.toggle(step.text, false))}>완료 표시 초기화</button>
  </dialog>;
}

export function CookingMode({ food }: { food: Food }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} className="mb-4 min-h-11 rounded-full bg-primary px-5 font-bold text-primary-foreground">요리 모드</button>
    {open && <CookingDialog food={food} onClose={() => { setOpen(false); trigger.current?.focus(); }} />}
  </>;
}
