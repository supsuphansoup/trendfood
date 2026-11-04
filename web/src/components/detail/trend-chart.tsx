// 최근 14일 검색량 그래프 (서버 렌더링 SVG)
export function TrendChart({ data, multiplier }: { data: number[]; multiplier: number }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 392, 72 - (v / max) * 66] as const);
  const last = pts[pts.length - 1];
  return (
    <figure className="m-0 rounded-2xl bg-muted px-[18px] pt-4 pb-2.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <figcaption className="text-sm text-body">네이버 검색량, 최근 14일</figcaption>
        <p className="text-[26px] font-black text-accent tabular-nums">{multiplier.toFixed(1)}배</p>
      </div>
      <svg
        viewBox="0 0 400 80"
        className="h-auto w-full"
        role="img"
        aria-label={`최근 14일 동안 검색량이 지난주 대비 ${multiplier.toFixed(1)}배로 늘어난 그래프`}
      >
        <line x1="0" y1="76" x2="400" y2="76" className="stroke-chart-5" />
        <polyline
          fill="none"
          className="stroke-chart-1"
          strokeWidth="3"
          strokeLinejoin="round"
          points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
        />
        <circle cx={last[0]} cy={last[1]} r="5" className="fill-chart-1" />
      </svg>
    </figure>
  );
}
