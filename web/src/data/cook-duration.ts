export function formatCookDuration(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  if (!hours) return `${remainder}분`;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

export function formatCookLabel(label: string): string {
  const duration = /^(조리 |예상 |약 )?(\d+(?:\.\d+)?)\s*(시간|분)$/.exec(label);
  if (!duration) return label;
  const [, prefix = "", value, unit] = duration;
  const minutes = Number(value) * (unit === "시간" ? 60 : 1);
  return Number.isFinite(minutes) ? `${prefix}${formatCookDuration(minutes)}` : label;
}
