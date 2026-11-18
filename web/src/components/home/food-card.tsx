import { FoodImage } from "@/components/food-image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LikeButton } from "@/components/like-button";
import { type Food } from "@/lib/foods";
import { cn } from "@/lib/utils";

export function FoodCard({ food, wide = false, unranked = false }: { food: Food; wide?: boolean; unranked?: boolean }) {
  const href = `/food/${food.slug}`;
  return (
    <li className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-feature bg-card", wide && "md:col-span-full md:grid md:grid-cols-2 md:items-stretch")}>
      {food.imageAvailable ? <div className={cn("relative aspect-[3/2] overflow-hidden bg-secondary", wide && "md:aspect-auto md:min-h-[300px]")}>
        <Link href={href} aria-label={`${food.name} 상세 보기`} className="absolute inset-0">
          <FoodImage food={food} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 460px" />
        </Link>
        <LikeButton slug={food.slug} name={food.name} className="absolute top-3 right-3" />
      </div> : <LikeButton slug={food.slug} name={food.name} className="absolute top-5 right-0 md:top-7" />}
      <div className={cn("flex flex-1 flex-col items-start gap-2 px-5 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4", wide && "md:justify-center md:p-8", !food.imageAvailable && "pr-16")}>
        <div className="flex min-h-7 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {food.editorial || unranked ? <span className="text-base font-bold text-accent">{food.category}</span> : <span className="text-[32px] leading-none font-black tracking-[-0.04em] text-accent tabular-nums">
            <span className="sr-only">순위 </span>
            {food.rank}
          </span>}
          <span className="text-meta text-muted-foreground">{unranked ? "일상 레시피" : food.editorial ? food.history?.years.map((year) => `${year}년`).join(" · ") || (food.kind === "discovery" ? "유행 시기 미확정" : "일상 레시피") : food.change}</span>
        </div>
        <h3 className="text-2xl leading-[1.35] font-bold tracking-[-0.02em] md:text-card-grid-title">
          <Link href={href} className="flex min-h-11 items-center text-foreground hover:text-foreground hover:underline">
            {food.name}
          </Link>
        </h3>
        {food.editorial?.newlyAdded && <p className="text-sm font-bold text-accent">새로 추가 · {food.editorial.recommendation!.date}</p>}
        <p data-testid="food-description" className="line-clamp-2 max-w-[32em] text-reading leading-[1.65] text-body">{food.history?.note ?? food.why}</p>
        <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-x-3 pt-1">
          <span className="text-meta text-muted-foreground">{food.kind === "discovery" ? "음식 소개" : food.kind === "product" ? "완제품 소개" : "레시피 제공"}</span>
          <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-base font-bold text-foreground hover:text-accent">
            음식 살펴보기 <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}
