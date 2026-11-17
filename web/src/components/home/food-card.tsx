import { FoodImage } from "@/components/food-image";
import Link from "next/link";
import { ArrowUpRight, Clock3, ShoppingBasket } from "lucide-react";
import { LikeButton } from "@/components/like-button";
import { buyable, type Food } from "@/lib/foods";

export function FoodCard({ food }: { food: Food }) {
  const href = `/food/${food.slug}`;
  return (
    <li className="relative flex min-w-0 flex-col gap-3">
      {food.imageAvailable ? <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary md:aspect-[4/3] md:rounded-3xl">
        <Link href={href} aria-label={`${food.name} 상세 보기`} className="absolute inset-0">
          <FoodImage food={food} sizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 380px" />
        </Link>
        <LikeButton slug={food.slug} name={food.name} className="absolute top-2 right-2 md:top-3 md:right-3" />
        {food.editorial && <span className="absolute bottom-2 left-2 rounded-sm bg-primary px-2 py-1 text-xs text-primary-foreground md:bottom-3 md:left-3">{food.generatedImage ? "AI 생성 예시" : "참고 사진"}</span>}
      </div> : <LikeButton slug={food.slug} name={food.name} className="absolute top-0 right-0" />}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex min-h-5 items-center justify-between gap-2 pr-1">
          {food.editorial ? <span className="text-[13px] font-bold text-accent">{food.category}</span> : <span className="text-2xl leading-none font-black text-accent tabular-nums">
            <span className="sr-only">순위 </span>
            {food.rank}
          </span>}
          <span className="text-[13px] text-muted-foreground">{food.editorial ? food.history?.years.at(-1) ? `${food.history.years.at(-1)}년` : food.kind === "discovery" ? "시기 미확정" : "일상 레시피" : food.change}</span>
        </div>
        <h3 className="text-feed-title leading-snug font-bold tracking-tight md:text-2xl">
          <Link href={href} className="flex min-h-11 items-center text-foreground hover:text-foreground hover:underline">
            {food.name}
          </Link>
        </h3>
        {food.editorial?.newlyAdded && <p className="text-sm font-bold text-accent">새로 추가 · {food.editorial.recommendation!.date}</p>}
        <p className="hidden max-w-[28em] text-sm leading-relaxed text-body md:line-clamp-2">{food.why}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {food.kind !== "discovery" && <Clock3 className="size-4" aria-hidden />}
            {food.kind === "discovery" ? "음식 소개" : food.kind === "product" ? "완제품 안내" : <>{food.editorial ? "예상" : "조리"} <b className="text-foreground">{food.cookMinutes}분</b></>}
          </span>
          {!food.editorial && <span>좋아요 {food.likes.toLocaleString("ko-KR")}</span>}
          {!food.editorial && <span>{food.category}</span>}
        </div>
        <div className="mt-auto flex items-center gap-1 border-t">
          <Link href={href} className="inline-flex min-h-11 flex-1 items-center gap-1 text-[13px] font-bold text-foreground hover:text-accent md:text-sm">
            {food.kind === "discovery" ? "음식 알아보기" : food.kind === "product" ? "제품 알아보기" : "레시피 보기"}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          {food.kind !== "discovery" && <Link
            href={`${href}#cart`}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 text-[13px] text-muted-foreground hover:text-accent"
          >
            <ShoppingBasket className="size-4" aria-hidden /><span className="sr-only md:not-sr-only">재료 {buyable(food).length}개 담기</span>
          </Link>}
        </div>
      </div>
    </li>
  );
}
