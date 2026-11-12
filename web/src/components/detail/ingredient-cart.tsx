"use client";

import { Check, ClipboardCopy, MessageCircle, RotateCcw, ShoppingCart } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { coupangUrl, type Food, won } from "@/lib/foods";
import { cn } from "@/lib/utils";
import { PANTRY_KEY, useStoredSet } from "@/lib/use-stored-set";
import { CART_KEY } from "@/components/shopping-cart";

// 재료 이름에서 용량을 뺀 기본 이름 ('무염 버터 200g' → '무염 버터'). '집에 있어요'는 이 이름으로 기억한다.
const baseName = (name: string) => name.replace(/\s[\d.]+\s?(g|kg|ml|매|개|개입|구|장|단).*$/, "");

const PRICE_AT = "11월 4일 09:00";

export function IngredientCart({ food }: { food: Food }) {
  const pantry = useStoredSet(PANTRY_KEY); // 집에 있어요 (일반 재료)
  const shoppingCart = useStoredSet(CART_KEY);
  const need = useStoredSet("tf:need"); // 기본은 집에 있는 재료지만 사겠다고 고른 것
  const added = useStoredSet(`tf:added:${food.slug}`);
  const [status, setStatus] = useState("");

  const rows = food.ingredients.map((ing) => {
    const key = baseName(ing.name);
    const home = ing.pantry ? !need.has(key) : pantry.has(key);
    return { ...ing, key, home, done: !home && added.has(ing.name) };
  });
  const toBuy = rows.filter((r) => !r.home);
  const doneCount = toBuy.filter((r) => r.done).length;
  const next = toBuy.find((r) => !r.done);
  const lastDone = [...toBuy].reverse().find((r) => r.done);
  const total = toBuy.reduce((sum, r) => sum + (r.price ?? 0), 0);
  const hasPrices = toBuy.some((r) => r.price !== undefined);

  const toggleRow = (r: (typeof rows)[number]) => {
    if (r.pantry) need.toggle(r.key, r.home);
    else pantry.toggle(r.key, !r.home);
  };

  const say = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), 2500);
  };

  const listText = () =>
    `[트렌드푸드] ${food.name} 재료\n` + toBuy.map((r) => `- ${r.name}${r.amount ? ` ${r.amount}` : ""}${r.price ? ` (${won(r.price)})` : ""}`).join("\n");

  const nextLink = next && {
    href: next.url ?? coupangUrl(next.name),
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      // 진행 상태로 링크가 다음 재료로 바뀌기 전에, 누른 재료의 주소를 연다.
      window.open(next.url ?? coupangUrl(next.name), "_blank", "noopener,noreferrer");
      added.toggle(next.name, true);
    },
    target: "_blank",
    rel: "sponsored noopener noreferrer",
  };

  return (
    <>
      <section
        id="cart"
        aria-labelledby="cart-title"
        className="flex scroll-mt-4 flex-col gap-3.5 rounded-3xl border bg-background p-[18px] md:p-6"
      >
        <p className="rounded-md bg-muted px-3 py-2.5 text-[13px] leading-normal text-muted-foreground">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
        <div className="flex items-baseline justify-between gap-2.5">
          <h2 id="cart-title" className="text-2xl font-black tracking-[-0.02em]">
            {food.kind === "product" ? "제품 장바구니" : "재료 장바구니"}
          </h2>
          <p className="text-sm font-bold tabular-nums">
            {doneCount}/{toBuy.length} 담음
          </p>
        </div>
        <Progress
          value={toBuy.length ? (doneCount / toBuy.length) * 100 : 0}
          aria-label="재료 담기 진행"
          className="h-2 [&_[data-slot=progress-indicator]]:bg-accent [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-secondary"
        />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">살 재료 고르기</legend>
          {rows.map((r) => (
            <label
              key={r.name}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2 text-base",
                r.home && "border border-dashed border-line-strong bg-white text-muted-foreground",
                r.done && "border bg-white",
                !r.home && !r.done && "bg-muted",
              )}
            >
              <input
                type="checkbox"
                checked={!r.home}
                onChange={() => toggleRow(r)}
                className="m-0 size-6 shrink-0 accent-primary"
              />
              <span className={cn(r.done && "text-muted-foreground line-through")}>
                {r.name}
                {r.amount && <span className="block text-sm text-muted-foreground">사용량 {r.amount}</span>}
              </span>
              {r.hard && !r.home && (
                <span className="rounded-sm bg-key-bg px-2 py-0.5 text-xs font-bold whitespace-nowrap text-key">
                  구하기 어려움
                </span>
              )}
              <span className="ml-auto text-right text-[13px] whitespace-nowrap text-muted-foreground">
                {r.done && (
                  <>
                    <span className="text-xs font-bold text-success">담음</span>
                    <br />
                  </>
                )}
                {r.home ? "집에 있어요" : r.price ? won(r.price) : ""}
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-[13px] leading-normal text-muted-foreground">
          체크를 풀면 &apos;집에 있어요&apos;로 기억해서 다음 레시피에서도 자동으로 빼 드려요.
        </p>
        <div>
          <p className="text-base">
            {toBuy.length}개 선택{hasPrices && <>, 참고 금액 <b>{won(total)}</b></>}
          </p>
          <p className="text-xs leading-normal text-muted-foreground">
            {hasPrices ? `${PRICE_AT} 기준 참고 가격이에요. 실제 가격과 다를 수 있어요.` : "가격은 구매 페이지에서 확인해 주세요. 사용량은 레시피 기준이며 상품 포장 용량과 달라요."}
          </p>
        </div>

        <button
          type="button"
          disabled={!toBuy.length}
          onClick={() => {
            toBuy.forEach((r) => shoppingCart.toggle(JSON.stringify({ slug: food.slug, food: food.name, name: r.name }), true));
            say("선택한 재료를 통합 장바구니에 담았어요");
          }}
          className="min-h-12 rounded-xl border border-line-strong bg-background px-4 font-bold disabled:opacity-50"
        >
          선택한 재료 통합 장바구니에 담기
        </button>
        {nextLink ? (
          <a
            {...nextLink}
            className="flex min-h-14 flex-col items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-center text-white hover:bg-destructive hover:text-white"
          >
            {lastDone && <span className="text-[13px] opacity-90">{lastDone.name} 담기 완료</span>}
            <b className="flex items-center gap-2 text-[17px]">
              <ShoppingCart className="size-5" aria-hidden />
              {doneCount === 0 ? `장보기 시작: ${next.name}` : `다음 재료 담기: ${next.name}`}
            </b>
          </a>
        ) : (
          <div className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-muted px-4 py-2.5 text-center">
            <b className="flex items-center gap-2 text-[17px] text-success">
              <Check className="size-5" aria-hidden />
              {toBuy.length ? "재료를 모두 담았어요" : "살 재료가 없어요"}
            </b>
            {doneCount > 0 && (
              <button
                type="button"
                onClick={() => toBuy.forEach((r) => added.toggle(r.name, false))}
                className="flex min-h-11 items-center gap-1.5 text-sm font-bold underline"
              >
                <RotateCcw className="size-4" aria-hidden />
                처음부터 다시 담기
              </button>
            )}
          </div>
        )}
        <p className="text-[13px] leading-normal text-muted-foreground">
          누를 때마다 쿠팡 상품 페이지가 하나씩 새 창으로 열려요. 담고 돌아오면 다음 재료가 이어서 보여요.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(listText());
                say("재료 목록을 복사했어요");
              } catch {
                say("복사하지 못했어요");
              }
            }}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-line-strong bg-white text-[15px] font-bold"
          >
            <ClipboardCopy className="size-4" aria-hidden />
            재료 목록 복사
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({ title: `${food.name} 재료`, text: listText() });
                  return;
                }
                await navigator.clipboard.writeText(listText());
                say("공유 기능이 없어 목록을 복사했어요. 카톡에 붙여 넣으세요");
              } catch {}
            }}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-line-strong bg-white text-[15px] font-bold"
          >
            <MessageCircle className="size-4" aria-hidden />
            카톡으로 보내기
          </button>
        </div>
        <p aria-live="polite" className="min-h-5 text-center text-sm font-bold text-success">
          {status}
        </p>
      </section>

      {nextLink && (
        <a
          {...nextLink}
          className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-bar bg-primary py-2.5 pr-2.5 pl-4 text-white shadow-bar hover:text-white lg:hidden"
        >
          <span className="flex flex-1 flex-col text-[13px] text-footer-foreground">
            {doneCount}/{toBuy.length} 담음, 쿠팡 파트너스 링크
            <b className="text-base text-white">다음: {baseName(next.name)}</b>
          </span>
          <span className="flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-5 text-base font-black">
            <ShoppingCart className="size-5" aria-hidden />
            담기
          </span>
        </a>
      )}
    </>
  );
}
