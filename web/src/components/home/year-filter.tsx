import { useId } from "react";

export function YearFilter({ year, onChange, onClear }: { year: number | null; onChange: (year: number) => void; onClear: () => void }) {
  const id = useId();
  const selected = year ?? 2025;

  return (
    <section aria-labelledby={`${id}-title`} className="mt-3 border-t px-3 pt-4 pb-3">
      <h2 id={`${id}-title`} className="text-sm font-bold text-foreground">연도별 유행 음식</h2>
      <div className="mt-3 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-muted-foreground">유행 연도</label>
        <output htmlFor={id} className="font-bold text-foreground tabular-nums">{selected}년</output>
      </div>
      <input
        id={id}
        type="range"
        min={2010}
        max={2025}
        step={1}
        value={selected}
        aria-valuetext={`${selected}년`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-accent"
      />
      <div aria-hidden className="flex justify-between text-xs text-muted-foreground tabular-nums"><span>2010년</span><span>2025년</span></div>
      <button type="button" onClick={() => onChange(selected)} className="mt-2 min-h-11 w-full rounded-lg bg-secondary px-3 text-sm font-bold text-foreground">{selected}년 음식 보기</button>
      {year !== null && <button type="button" onClick={onClear} className="mt-2 min-h-11 text-sm font-bold text-accent underline">연도 선택 해제</button>}
    </section>
  );
}
