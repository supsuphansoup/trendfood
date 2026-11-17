import { FoodImage } from "@/components/food-image";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { LikeButton } from "@/components/like-button";
import { buyable, type Food } from "@/lib/foods";
import { cn } from "@/lib/utils";

export function FoodCard({ food, wide = false }: { food: Food; wide?: boolean }) {
  const href = `/food/${food.slug}`;
  return (
    <li className={cn("relative flex min-w-0 flex-col gap-4", wide && "md:col-span-full md:grid md:grid-cols-2 md:items-center md:gap-12")}>
      {food.imageAvailable ? <div className="relative aspect-[3/2] overflow-hidden rounded-feature bg-secondary">
        <Link href={href} aria-label={`${food.name} 상세 보기`} className="absolute inset-0">
          <FoodImage food={food} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 460px" />
        </Link>
        <LikeButton slug={food.slug} name={food.name} className="absolute top-3 right-3" />
        {food.editorial && <span className="absolute bottom-0 left-0 rounded-tr-feature bg-background px-2.5 py-1.5 text-xs text-muted-foreground">{food.generatedImage ? "AI 생성 예시" : "참고 사진"}</span>}
      </div> : <LikeButton slug={food.slug} name={food.name} className="absolute top-5 right-0 md:top-7" />}
      <div className={cn("flex flex-1 flex-col gap-1.5", wide && "md:py-4 md:pr-8", !food.imageAvailable && "pr-14")}>
        <div className="flex min-h-7 items-center justify-between gap-3">
          {food.editorial ? <span className="text-sm font-semibold text-accent">{food.category}</span> : <span className="text-[32px] leading-none font-black tracking-[-0.04em] text-accent tabular-nums">
            <span className="sr-only">순위 </span>
            {food.rank}
          </span>}
          <span className="text-[13px] text-muted-foreground">{food.editorial ? food.history?.years.map((year) => `${year}년`).join(" · ") || (food.kind === "discovery" ? "유행 시기 미확정" : "일상 레시피") : food.change}</span>
        </div>
        <h3 className="text-2xl leading-tight font-bold tracking-[-0.03em] md:text-card-grid-title">
          <Link href={href} className="flex min-h-11 items-center text-foreground hover:text-foreground hover:underline">
            {food.name}
          </Link>
        </h3>
        {food.editorial?.newlyAdded && <p className="text-sm font-bold text-accent">새로 추가 · {food.editorial.recommendation!.date}</p>}
        <p className="line-clamp-2 max-w-[28em] text-[15px] leading-[1.7] text-body">{food.why}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {food.kind !== "discovery" && <Clock3 className="size-4" aria-hidden />}
            {food.kind === "discovery" ? "음식 소개" : food.kind === "product" ? "완제품 안내" : <>{food.editorial ? "예상" : "조리"} <b className="text-foreground">{food.cookMinutes}분</b></>}
          </span>
          {!food.editorial && <span>좋아요 {food.likes.toLocaleString("ko-KR")}</span>}
          {!food.editorial && <span>{food.category}</span>}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-1 pt-2">
          <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline decoration-line-strong underline-offset-4 hover:text-accent">
            {food.kind === "discovery" ? "음식 알아보기" : food.kind === "product" ? "제품 알아보기" : "레시피 보기"}
          </Link>
          {food.kind !== "discovery" && <Link
            href={`${href}#cart`}
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            재료 {buyable(food).length}개 담기
          </Link>}
        </div>
      </div>
    </li>
  );
}
