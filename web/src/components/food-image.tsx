import Image from "next/image";
import type { Food } from "@/lib/foods";

export function FoodImage({ food, hero = false, preload = false, sizes }: { food: Food; hero?: boolean; preload?: boolean; sizes: string }) {
  if (!food.imageAvailable) return null;
  return <Image src={hero ? food.heroImage ?? food.image : food.image} alt={hero ? food.heroAlt ?? food.alt : food.alt} fill preload={preload} sizes={sizes} className="object-cover" placeholder={(hero ? food.heroImage ?? food.image : food.image).blurDataURL ? "blur" : "empty"} />;
}
