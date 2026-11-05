"use client";

import Link from "next/link";
import { useRef } from "react";
import { ShoppingCart, X } from "lucide-react";
import { useStoredSet } from "@/lib/use-stored-set";

export const CART_KEY = "tf:shopping-cart";
type CartItem = { slug: string; food: string; name: string };

export function ShoppingCartPanel({ compact = false }: { compact?: boolean }) {
  const cart = useStoredSet(CART_KEY);
  const dialog = useRef<HTMLDialogElement>(null);
  const items = cart.items.flatMap((raw) => {
    try {
      const item = JSON.parse(raw) as CartItem;
      if ([item.slug, item.food, item.name].every((value) => typeof value === "string")) return [{ ...item, raw }];
    } catch {}
    return [];
  });

  return (
    <>
      <button type="button" aria-label={`장바구니 ${items.length}`} onClick={() => dialog.current?.showModal()} className={compact ? "flex size-[46px] shrink-0 items-center justify-center rounded-full bg-background text-foreground" : "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-background px-3 text-sm font-bold text-foreground"}>
        <ShoppingCart className="size-5" aria-hidden />
        <span className="sr-only">장바구니</span>
        <span className={compact ? "sr-only" : undefined}>{items.length}</span>
      </button>
      <dialog ref={dialog} aria-labelledby="shopping-cart-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border bg-background p-5 text-foreground backdrop:bg-scrim">
        <div className="flex items-center justify-between gap-3">
          <h2 id="shopping-cart-title" className="text-2xl font-black">통합 장바구니</h2>
          <button type="button" autoFocus aria-label="장바구니 닫기" onClick={() => dialog.current?.close()} className="flex size-11 items-center justify-center rounded-lg border"><X aria-hidden /></button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">여러 음식에서 고른 재료를 이 브라우저에 모아두어요.</p>
        {items.length ? (
          <ul className="mt-4 divide-y">
            {items.map((item) => (
              <li key={item.raw} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.name}</p>
                  <Link href={`/food/${item.slug}#cart`} onClick={() => dialog.current?.close()} className="inline-flex min-h-11 items-center text-sm underline">{item.food}</Link>
                </div>
                <button type="button" aria-label={`${item.food} ${item.name} 삭제`} onClick={() => cart.toggle(item.raw, false)} className="min-h-11 rounded-lg border px-3">삭제</button>
              </li>
            ))}
          </ul>
        ) : <p className="py-10 text-center">장바구니가 비어 있어요. 음식 상세에서 재료를 담아보세요.</p>}
      </dialog>
    </>
  );
}
