import Image from "next/image";
import Link from "next/link";
import { LikeButton } from "@/components/like-button";
import { buttonVariants } from "@/components/ui/button";
import { buyable, type Food } from "@/lib/foods";
import { cn } from "@/lib/utils";

export function FoodCard({ food }: { food: Food }) {
  const href = `/food/${food.slug}`;
  return (
    <li className="grid items-center gap-[14px] border-b py-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-9 md:py-7">
      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-secondary md:rounded-3xl">
        <Link href={href} aria-label={`${food.name} 상세 보기`} className="absolute inset-0">
          <Image
            src={food.image}
            alt={food.alt}
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
            placeholder="blur"
          />
        </Link>
        <LikeButton slug={food.slug} name={food.name} className="absolute top-3 right-3" />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline gap-3">
          <span className="text-[40px] leading-[0.9] font-black tracking-[-0.04em] text-accent tabular-nums md:text-rank">
            <span className="sr-only">순위 </span>
            {food.rank}
          </span>
          <span className="text-sm font-bold text-muted-foreground">{food.change}</span>
        </div>
        <h3 className="text-2xl leading-tight font-black tracking-[-0.02em] md:text-card-title">
          <Link href={href} className="text-foreground hover:text-foreground hover:underline">
            {food.name}
          </Link>
        </h3>
        <p className="max-w-[28em] text-[15px] leading-[1.65] text-body md:text-[17px]">{food.why}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span>
            조리 <b className="text-foreground">{food.cookMinutes}분</b>
          </span>
          <span>좋아요 {food.likes.toLocaleString("ko-KR")}</span>
          <span>{food.category}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Link href={href} className={cn(buttonVariants(), "flex-1 text-white hover:text-white md:flex-none")}>
            레시피 보기
          </Link>
          <Link
            href={`${href}#cart`}
            className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-foreground hover:text-foreground md:flex-none")}
          >
            재료 {buyable(food).length}개 담기
          </Link>
        </div>
      </div>
    </li>
  );
}
