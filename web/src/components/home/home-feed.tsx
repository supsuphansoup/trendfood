"use client";

import {
  ArrowUp,
  CakeSlice,
  Cookie,
  CookingPot,
  Flame,
  Heart,
  LayoutGrid,
  type LucideIcon,
  Search,
  Soup,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AdSlot } from "@/components/ad-slot";
import { FoodCard } from "@/components/home/food-card";
import { LikeCount } from "@/components/like-button";
import { buyable, categoryOptions, type Food, sortOptions, tagOptions } from "@/lib/foods";
import { cn } from "@/lib/utils";
import { LIKES_KEY, useStoredSet } from "@/lib/use-stored-set";

type Sort = (typeof sortOptions)[number];
type Tab = "전체" | (typeof categoryOptions)[number] | "찜";

const tabIcons: Record<Tab, LucideIcon> = {
  전체: LayoutGrid,
  디저트: CakeSlice,
  밥: CookingPot,
  면: Soup,
  분식: Flame,
  간식: Cookie,
  찜: Heart,
};
const tabs: Tab[] = ["전체", ...categoryOptions];

const chipClass =
  "min-h-[42px] shrink-0 rounded-full bg-secondary px-4 text-[15px] font-medium whitespace-nowrap text-foreground aria-pressed:bg-primary aria-pressed:font-bold aria-pressed:text-primary-foreground";

/** 주소(?cat=&sort=&tag=&q=)와 화면 상태를 맞춘다. 뒤로가기·공유해도 같은 목록이 보인다 */
function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const cat = p.get("cat");
  const sort = p.get("sort");
  const tag = p.get("tag");
  return {
    tab: ([...tabs, "찜"] as string[]).includes(cat ?? "") ? (cat as Tab) : "전체",
    sort: (sortOptions as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "급상승순",
    tag: (tagOptions as readonly string[]).includes(tag ?? "") ? tag : null,
    q: p.get("q") ?? "",
  };
}

export function HomeFeed({ foods }: { foods: Food[] }) {
  const top = foods[0];
  const [tab, setTab] = useState<Tab>("전체");
  const [sort, setSort] = useState<Sort>("급상승순");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [showTop, setShowTop] = useState(false);
  const [ready, setReady] = useState(false);
  const likes = useStoredSet(LIKES_KEY);
  const listRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // 처음 열 때 주소의 필터를 읽는다
  useEffect(() => {
    const s = readUrl();
    /* eslint-disable react-hooks/set-state-in-effect -- 브라우저 주소는 첫 렌더 뒤에만 읽을 수 있다 */
    setTab(s.tab);
    setSort(s.sort);
    setTag(s.tag);
    setQuery(s.q);
    setApplied(s.q);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onPop = () => {
      const n = readUrl();
      setTab(n.tab);
      setSort(n.sort);
      setTag(n.tag);
      setQuery(n.q);
      setApplied(n.q);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (tab !== "전체") p.set("cat", tab);
    if (sort !== "급상승순") p.set("sort", sort);
    if (tag) p.set("tag", tag);
    if (applied.trim()) p.set("q", applied.trim());
    const next = p.size ? `?${p}` : window.location.pathname;
    if (next !== window.location.search && !(next === window.location.pathname && !window.location.search)) {
      window.history.pushState(null, "", next);
    }
  }, [ready, tab, sort, tag, applied]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 전체: foods.length, 찜: likes.items.length };
    for (const f of foods) c[f.category] = (c[f.category] ?? 0) + 1;
    return c;
  }, [foods, likes.items]);

  const q = applied.trim();
  const filtering = Boolean(q || tag || tab !== "전체");

  const list = useMemo(() => {
    const filtered = foods.filter(
      (f) =>
        (filtering || f.rank > 1) &&
        (tab === "전체" || (tab === "찜" ? likes.items.includes(f.slug) : f.category === tab)) &&
        (!tag || f.tags.includes(tag)) &&
        (!q || f.name.includes(q) || f.ingredients.some((i) => i.name.includes(q)) || f.why.includes(q)),
    );
    const by: Record<Sort, (a: Food, b: Food) => number> = {
      급상승순: (a, b) => a.rank - b.rank,
      좋아요순: (a, b) => b.likes - a.likes,
      조리시간순: (a, b) => a.cookMinutes - b.cookMinutes,
    };
    return [...filtered].sort(by[sort]);
  }, [foods, sort, tag, tab, likes.items, q, filtering]);

  /** 목록 위쪽이 화면 밖에 있으면 목록 처음으로 올려 준다 */
  const toList = () => {
    const el = listRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth" });
  };
  const pickTab = (t: Tab) => {
    setTab(t);
    toList();
  };
  const reset = () => {
    setTab("전체");
    setTag(null);
    setQuery("");
    setApplied("");
  };

  const title = [tab === "전체" ? (filtering ? "전체" : "2위부터") : tab === "찜" ? "찜한 음식" : tab, tag && `#${tag}`, q && `'${q}' 검색`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section aria-label="오늘의 1위" className="relative h-[560px] overflow-hidden bg-primary md:h-[640px]">
        <Image
          src={top.heroImage ?? top.image}
          alt={top.heroAlt ?? top.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover"
          placeholder="blur"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,12,8,0.55)_0%,rgba(20,12,8,0)_28%,rgba(20,12,8,0)_40%,rgba(20,12,8,0.86)_100%)]"
        />
        <header className="relative">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-[18px] gap-y-3 px-5 py-4">
            <Link href="/" onClick={reset} className="text-2xl font-black tracking-[-0.03em] text-white hover:text-white">
              트렌드푸드
            </Link>
            <form
              role="search"
              className="order-3 flex h-[46px] flex-[1_1_280px] items-center gap-2 rounded-full bg-white/95 pr-1.5 pl-4 md:order-2"
              onSubmit={(e) => {
                e.preventDefault();
                setApplied(query);
                searchRef.current?.blur();
                listRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <label htmlFor="q" className="sr-only">
                음식 이름이나 재료로 검색
              </label>
              <input
                ref={searchRef}
                id="q"
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) setApplied("");
                }}
                placeholder="뭐 먹고 싶어요? 재료로도 찾아요"
                className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setQuery("");
                    setApplied("");
                    searchRef.current?.focus();
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </form>
            <nav aria-label="바로가기" className="order-2 ml-auto flex items-center gap-1 text-sm md:order-3">
              <Link href="/about#partners" className="px-2.5 py-3 text-white hover:text-white">
                제휴 안내
              </Link>
              <button
                type="button"
                aria-pressed={tab === "찜"}
                onClick={() => {
                  setTab(tab === "찜" ? "전체" : "찜");
                  listRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-white px-4 py-2.5 font-bold text-foreground aria-pressed:bg-accent aria-pressed:text-white"
              >
                <LikeCount />
              </button>
            </nav>
          </div>
        </header>
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-5 pb-11 text-white">
            <p className="text-base font-bold">오늘 가장 많이 찾은 음식, 1위</p>
            <h1 className="text-5xl leading-none font-black tracking-[-0.04em] md:text-hero">{top.name}</h1>
            <p className="max-w-[34em] text-base leading-relaxed md:text-lg">{top.why}</p>
            <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
              <Link
                href={`/food/${top.slug}`}
                className="rounded-xl bg-white px-[26px] py-4 text-[17px] font-black text-foreground hover:text-foreground"
              >
                레시피 보기
              </Link>
              <Link
                href={`/food/${top.slug}#cart`}
                className="rounded-xl border-[1.5px] border-white/80 px-6 py-3.5 text-[17px] font-bold text-white hover:text-white"
              >
                재료 {buyable(top).length}개 담기
              </Link>
              <span className="text-sm">조리 {top.cookMinutes}분</span>
            </div>
            <p className="text-xs text-footer-muted">AI 요약, 운영자 검수 완료. 데모 사진</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 lg:px-5">
        {/* PC: 왼쪽 카테고리 탭 */}
        <aside className="hidden lg:block">
          <nav aria-label="카테고리" className="sticky top-0 flex flex-col gap-1 pt-6">
            <p className="px-3 pb-2 text-[13px] font-bold text-muted-foreground">카테고리</p>
            {[...tabs, "찜" as const].map((t) => {
              const Icon = tabIcons[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-current={tab === t ? "true" : undefined}
                  onClick={() => pickTab(t)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-base text-foreground hover:bg-muted",
                    t === "찜" && "mt-3 border-t pt-3",
                    tab === t && "bg-secondary font-bold hover:bg-secondary",
                  )}
                >
                  <Icon className={cn("size-5", tab === t ? "text-accent" : "text-muted-foreground")} aria-hidden />
                  <span className="flex-1">{t === "찜" ? "찜한 음식" : t}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{counts[t] ?? 0}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-10 border-b bg-background">
            {/* 모바일: 상단 카테고리 탭 */}
            <nav aria-label="카테고리" className="lg:hidden">
              <div className="flex gap-1 overflow-x-auto border-b px-3 [scrollbar-width:none]">
                {[...tabs, "찜" as const].map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-current={tab === t ? "true" : undefined}
                    onClick={() => pickTab(t)}
                    className={cn(
                      "-mb-px flex min-h-12 shrink-0 items-center gap-1 border-b-[3px] border-transparent px-3 text-base whitespace-nowrap text-muted-foreground",
                      tab === t && "border-accent font-bold text-foreground",
                    )}
                  >
                    {t === "찜" ? "찜" : t}
                    <span className="text-[13px] tabular-nums">{counts[t] ?? 0}</span>
                  </button>
                ))}
              </div>
            </nav>
            <nav aria-label="정렬과 태그" className="flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] lg:px-0">
              {sortOptions.map((s) => (
                <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={chipClass}>
                  {s}
                </button>
              ))}
              <span aria-hidden className="mx-1 my-1 w-px shrink-0 bg-border" />
              {tagOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={chipClass}
                >
                  #{t}
                </button>
              ))}
            </nav>
          </div>

          <main id="list" ref={listRef} className="scroll-mt-0 px-5 pt-4 pb-14 lg:px-0">
            <div aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-lg font-black">{title}</h2>
              <span className="text-sm text-muted-foreground">{list.length}개</span>
              {filtering && (
                <button type="button" onClick={reset} className="min-h-11 text-sm font-bold text-accent underline">
                  전체 보기
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-base text-body">
                  {tab === "찜" ? "아직 찜한 음식이 없어요. 사진 위 하트를 눌러 보세요." : "맞는 음식이 없어요. 다른 말로 찾아보세요."}
                </p>
                <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-primary px-5 font-bold text-white">
                  전체 순위 보기
                </button>
              </div>
            ) : (
              <ol className="m-0 list-none p-0">
                {list.map((food, i) => (
                  <Fragment key={food.slug}>
                    <FoodCard food={food} />
                    {i === 2 && list.length > 3 && (
                      <li className="list-none">
                        <AdSlot label="인피드" className="my-7 h-[130px]" />
                      </li>
                    )}
                  </Fragment>
                ))}
              </ol>
            )}
            {!filtering && (
              <p className="mt-7 flex min-h-14 w-full items-center justify-center rounded-xl border-[1.5px] border-primary text-base font-bold">
                11위부터는 트렌드 수집이 연결되면 보여요
              </p>
            )}
          </main>
        </div>
      </div>

      {showTop && (
        <button
          type="button"
          aria-label="맨 위로"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-4 bottom-5 z-20 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-bar"
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      )}
    </>
  );
}
