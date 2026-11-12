import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import type { Food } from "@/lib/foods";

export function FoodImage({ food, hero = false, preload = false, sizes }: { food: Food; hero?: boolean; preload?: boolean; sizes: string }) {
  if (!food.imageAvailable) {
    return (
      <div role="img" aria-label={`${food.name} 사진 준비 중`} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary p-6 text-center text-muted-foreground">
        <UtensilsCrossed className="size-10 opacity-50" aria-hidden />
        <span className="text-lg font-bold">{food.name}</span>{" "}
        <span className="text-xs">사진 준비 중</span>
      </div>
    );
  }
  return <Image src={hero ? food.heroImage ?? food.image : food.image} alt={hero ? food.heroAlt ?? food.alt : food.alt} fill preload={preload} sizes={sizes} className="object-cover" placeholder={(hero ? food.heroImage ?? food.image : food.image).blurDataURL ? "blur" : "empty"} />;
}
