import { cn } from "@/lib/utils";

// 애드센스 자리. 높이를 미리 확보해 CLS를 막는다 (prd.md 5장). 승인 전에는 빈 자리 표시만.
export function AdSlot({ label, className }: { label: string; className?: string }) {
  return (
    <aside
      aria-label="광고"
      className={cn(
        "flex items-center justify-center rounded-2xl border border-dashed border-line-dashed bg-muted text-[13px] text-muted-foreground",
        className,
      )}
    >
      광고 자리 ({label})
    </aside>
  );
}
