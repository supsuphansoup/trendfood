import Image from "next/image";
import type { Food } from "@/lib/foods";
import { photoHeroFit } from "@/data/photo-presentation";

export function FoodImage({ food, hero = false, preload = false, sizes }: { food: Food; hero?: boolean; preload?: boolean; sizes: string }) {
  if (!food.imageAvailable) return null;
  const source = hero ? food.heroImage ?? food.image : food.image;
  const preserveFrame = hero && !!food.photoCredit && photoHeroFit(source.width, source.height) === "contain";
  return <>
    {preserveFrame && <Image src={source} alt="" aria-hidden fill sizes={sizes} className="scale-110 object-cover blur-2xl" />}
    <Image src={source} alt={hero ? food.heroAlt ?? food.alt : food.alt} fill preload={preload} sizes={sizes} className={preserveFrame ? "object-contain lg:object-right" : "object-cover"} placeholder={source.blurDataURL ? "blur" : "empty"} />
  </>;
}
