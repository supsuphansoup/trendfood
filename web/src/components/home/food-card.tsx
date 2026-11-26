import { FoodImage } from "@/components/food-image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LikeButton } from "@/components/like-button";
import { type Food } from "@/lib/foods";
import { cn } from "@/lib/utils";
import type { pantryMatch } from "@/data/recipe-tools";

export function FoodCard({ food, columns, heading: Heading = "h3", unranked = false, match }: { food: Food; columns: 2 | 3; heading?: "h2" | "h3"; unranked?: boolean; match?: ReturnType<typeof pantryMatch> }) {
  const href = `/food/${food.slug}`;
  return (
    <li data-motion-result className="relative flex min-w-0 origin-top-left flex-col overflow-hidden rounded-feature bg-card">
      {food.imageAvailable ? <div className={cn("relative aspect-[4/3] overflow-hidden bg-secondary", columns === 2 ? "max-h-60 xl:max-h-[clamp(15rem,20vw,21rem)]" : "max-h-48 xl:max-h-[clamp(12rem,16vw,17rem)]")}>
        <Link href={href} aria-label={`${food.name} 상세 보기`} className="absolute inset-0 focus-visible:-outline-offset-4">
          <FoodImage food={food} fit="contain" sizes={columns === 2 ? "(min-width: 1640px) 800px, 50vw" : "(min-width: 1640px) 520px, 33vw"} />
        </Link>
        <LikeButton slug={food.slug} name={food.name} className="absolute top-0 right-0 sm:top-2 sm:right-2" />
      </div> : <LikeButton slug={food.slug} name={food.name} className="absolute top-0 right-0 sm:top-2 sm:right-2" />}
      <div className={cn("flex flex-1 flex-col items-start gap-1.5 p-2.5 wrap-anywhere sm:gap-2 sm:p-4", !food.imageAvailable && "pt-11 sm:pt-12")}>
        <div className={cn("flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1", columns === 2 && "min-h-7")}>
          {columns === 3 || food.editorial || unranked ? <span className="text-sm font-bold text-accent sm:text-base">{food.category}</span> : <span className="text-[32px] leading-none font-black tracking-[-0.04em] text-accent tabular-nums">
            <span className="sr-only">순위 </span>
            {food.rank}
          </span>}
          {columns === 2 && <span className="text-meta text-muted-foreground">{unranked && !match ? "일상 레시피" : food.editorial ? food.history?.years.map((year) => `${year}년`).join(" · ") || (food.kind === "discovery" ? "유행 시기 미확정" : "일상 레시피") : food.change}</span>}
        </div>
        <Heading className="text-base leading-[1.35] font-bold tracking-[-0.02em] sm:text-xl md:text-2xl">
          <Link href={href} className="motion-press flex min-h-11 items-center text-foreground hover:text-foreground hover:underline">
            {food.name}
          </Link>
        </Heading>
        {columns === 2 && <>
          {food.publishedAt ? <p className="text-sm font-bold text-accent">등록일 {food.publishedAt}</p> : food.editorial?.newlyAdded && <p className="text-sm font-bold text-accent">새로 추가 · {food.editorial.recommendation!.date}</p>}
          <p data-testid="food-description" className="line-clamp-2 max-w-[32em] text-sm leading-relaxed text-body sm:text-reading">{food.history?.note ?? food.why}</p>
          {match && <p data-testid="pantry-match" className="rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed"><b>{match.have}/{match.total}개 재료 보유</b><br />{match.missing.length ? `부족한 재료 ${match.missing.length}개: ${match.missing.map((item) => item.name).join(", ")}` : "재료가 모두 있어요"}</p>}
          <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-x-3 pt-1">
            <span className="text-meta text-muted-foreground">{food.kind === "discovery" ? "음식 소개" : food.kind === "product" ? "완제품 소개" : "레시피 제공"}</span>
            <Link href={href} className="motion-press inline-flex min-h-11 items-center gap-1 text-sm font-bold text-foreground hover:text-accent sm:gap-1.5 sm:text-base">
              음식 살펴보기 <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </>}
      </div>
    </li>
  );
}
