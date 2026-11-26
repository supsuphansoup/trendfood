import Image from "next/image";
import type { Food } from "@/lib/foods";
import { photoHeroFit } from "@/data/photo-presentation";

export function FoodImage({ food, hero = false, fullFrame = false, contain = false, fit, preload = false, eager = false, sizes }: { food: Food; hero?: boolean; fullFrame?: boolean; contain?: boolean; fit?: "cover" | "contain"; preload?: boolean; eager?: boolean; sizes: string }) {
  if (!food.imageAvailable) return null;
  const source = hero ? food.heroImage ?? food.image : food.image;
  const preserveFrame = !fullFrame && !contain && !fit && hero && !!food.photoCredit && photoHeroFit(source.width, source.height) === "contain";
  return <>
    {preserveFrame && <Image src={source} alt="" aria-hidden fill sizes={sizes} className="scale-110 object-cover blur-2xl" />}
    <Image src={source} alt={hero ? food.heroAlt ?? food.alt : food.alt} fill={!fullFrame && !contain} preload={preload} loading={!preload && eager ? "eager" : undefined} fetchPriority={hero || preload ? undefined : "low"} sizes={sizes} className={fullFrame ? "h-auto max-h-[280px] w-full object-contain md:max-h-[400px]" : contain ? "h-auto max-h-full w-auto max-w-full rounded-2xl object-contain md:rounded-3xl" : preserveFrame ? "object-contain lg:object-right" : fit === "contain" ? "object-contain" : "object-cover"} placeholder={source.blurDataURL ? "blur" : "empty"} />
  </>;
}
