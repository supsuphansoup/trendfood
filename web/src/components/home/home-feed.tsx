"use client";

import {
  ArrowUp,
  ArrowUpRight,
  CakeSlice,
  ChevronDown,
  Cookie,
  CookingPot,
  Flame,
  Heart,
  LayoutGrid,
  type LucideIcon,
  Search,
  SlidersHorizontal,
  Soup,
  X,
} from "lucide-react";
import { FoodImage } from "@/components/food-image";
import { SiteLogo } from "@/components/site-logo";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AdSlot } from "@/components/ad-slot";
import { FoodCard } from "@/components/home/food-card";
import { YearFilter } from "@/components/home/year-filter";
import { trendHistory } from "@/data/trend-history";
import { LikeCount } from "@/components/like-button";
import { categoryOptions, type Food, sortOptions, tagOptions } from "@/lib/foods";
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
const tabs: Tab[] = ["전체", ...categoryOptions.filter((category) => category !== "간식")];

const chipClass =
  "min-h-11 shrink-0 rounded-full border border-transparent bg-muted px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-line-strong aria-pressed:bg-accent aria-pressed:font-bold aria-pressed:text-accent-foreground";

/** 주소의 필터를 보존해 뒤로가기·공유 때 같은 목록을 보여준다. */
function readUrl(years: number[]) {
  const p = new URLSearchParams(window.location.search);
  const cat = p.get("cat");
  const sort = p.get("sort");
  const tag = p.get("tag");
  const year = Number(p.get("year"));
  return {
    tab: ([...tabs, "찜"] as string[]).includes(cat ?? "") ? (cat as Tab) : "전체",
    sort: (sortOptions as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "급상승순",
    tag: (tagOptions as readonly string[]).includes(tag ?? "") ? tag : null,
    q: p.get("q") ?? "",
    year: years.length ? (years.includes(year) ? year : null) : (Number.isInteger(year) && year >= 2010 && year <= 2025 ? year : null),
  };
}

export function HomeFeed({ foods }: { foods: Food[] }) {
  const top = foods[0];
  const spotlights = foods.slice(1, 3);
  const recommendation = top.editorial?.recommendation;
  const curated = foods.every((food) => food.editorial);
  const years = useMemo(() => [...new Set(foods.flatMap((food) => food.history?.years ?? []))].sort((a, b) => a - b), [foods]);
  const [year, setYear] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("전체");
  const [sort, setSort] = useState<Sort>("급상승순");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [showTop, setShowTop] = useState(false);
  const [ready, setReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const likes = useStoredSet(LIKES_KEY);
  const listRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // 처음 열 때 주소의 필터를 읽는다
  useEffect(() => {
    const s = readUrl(years);
    /* eslint-disable react-hooks/set-state-in-effect -- 브라우저 주소는 첫 렌더 뒤에만 읽을 수 있다 */
    setTab(s.tab);
    setSort(s.sort);
    setTag(s.tag);
    setQuery(s.q);
    setApplied(s.q);
    setYear(s.year);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onPop = () => {
      const n = readUrl(years);
      setTab(n.tab);
      setSort(n.sort);
      setTag(n.tag);
      setQuery(n.q);
      setApplied(n.q);
      setYear(n.year);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [years]);

  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (tab !== "전체") p.set("cat", tab);
    if (sort !== "급상승순") p.set("sort", sort);
    if (tag) p.set("tag", tag);
    if (applied.trim()) p.set("q", applied.trim());
    if (year !== null) p.set("year", String(year));
    const next = p.size ? `?${p}` : window.location.pathname;
    if (next !== window.location.search && !(next === window.location.pathname && !window.location.search)) {
      window.history.pushState(null, "", next);
    }
  }, [ready, tab, sort, tag, applied, year]);

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
  const filtering = Boolean(q || tag || tab !== "전체" || year !== null);
  const history = trendHistory.filter((item) => item.year === year);

  const list = useMemo(() => {
    const filtered = foods.filter(
      (f) =>
        (filtering || f.rank > 1) &&
        (tab === "전체" || (tab === "찜" ? likes.items.includes(f.slug) : f.category === tab)) &&
        (!tag || f.tags.includes(tag)) &&
        (!curated || !year || f.history?.years.includes(year)) &&
        (!q || f.name.includes(q) || f.ingredients.some((i) => i.name.includes(q)) || f.why.includes(q)),
    );
    const by: Record<Sort, (a: Food, b: Food) => number> = {
      급상승순: (a, b) => a.rank - b.rank,
      좋아요순: (a, b) => b.likes - a.likes,
      조리시간순: (a, b) => (a.kind === "discovery" ? Infinity : a.cookMinutes) - (b.kind === "discovery" ? Infinity : b.cookMinutes),
    };
    return [...filtered].sort(by[sort]);
  }, [foods, sort, tag, tab, likes.items, q, year, filtering, curated]);

  /** 목록 위쪽이 화면 밖에 있으면 목록 처음으로 올려 준다 */
  const toList = () => {
    const el = listRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth" });
  };
  const pickTab = (t: Tab) => {
    if (!curated) setYear(null);
    setTab(t);
    toList();
  };
  const reset = () => {
    setYear(null);
    setTab("전체");
    setTag(null);
    setQuery("");
    setApplied("");
  };
  const pickYear = (value: number) => {
    setYear(value);
    setTab("전체");
    setTag(null);
    setQuery("");
    setApplied("");
    toList();
  };

  const title = [tab === "전체" ? (filtering ? "전체" : curated ? "유행 음식과 일상 레시피" : "2위부터") : tab === "찜" ? "찜한 음식" : tab, year && `${year}년 화제`, tag && `#${tag}`, q && `'${q}' 검색`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="border-b bg-card">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <Link href="/" onClick={reset} className="flex min-h-11 items-center gap-2 text-[22px] font-black tracking-[-0.04em] text-foreground hover:text-accent md:text-2xl">
              <SiteLogo />
              트렌드푸드
            </Link>
            <form
              role="search"
              className="order-3 flex h-12 min-w-0 basis-full items-center gap-2 rounded-full border border-input bg-background pr-1 pl-4 focus-within:border-accent md:order-2 md:ml-auto md:max-w-[380px] md:flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!curated) setYear(null);
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
                placeholder="오늘 끌리는 음식이나 재료"
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
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
              <button type="submit" aria-label="검색" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground hover:bg-destructive"><ArrowUpRight className="size-5" aria-hidden /></button>
            </form>
            <nav aria-label="바로가기" className="order-2 ml-auto flex items-center gap-1 text-sm md:order-3 md:ml-0 md:gap-2">
              <Link href="/about#partners" className="hidden min-h-11 items-center px-2.5 text-muted-foreground hover:text-foreground xl:inline-flex">
                제휴 안내
              </Link>
              <button
                type="button"
                aria-pressed={tab === "찜"}
                onClick={() => {
                  setYear(null);
                  setTab(tab === "찜" ? "전체" : "찜");
                  listRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex h-11 items-center gap-1.5 rounded-full bg-muted px-3 font-bold text-foreground aria-pressed:bg-accent aria-pressed:text-white"
              >
                <Heart className="size-4" aria-hidden />
                <LikeCount />
              </button>
            </nav>
          </div>
      </header>

      <section aria-label="유행 음식 탐색" className="mx-auto w-full max-w-[1200px] px-4 pt-5 pb-5 md:px-5 md:pt-7 md:pb-7">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:gap-6">
          <section aria-label={curated ? "오늘의 음식" : "오늘의 1위"} className="relative flex flex-col overflow-hidden rounded-feature bg-primary text-primary-foreground">
            {top.imageAvailable && <div className="relative h-[210px] overflow-hidden bg-secondary [&_img]:object-center md:h-[320px]"><FoodImage food={top} hero preload sizes="(max-width: 767px) 100vw, 740px" /></div>}
            <div className="absolute top-4 right-4 left-4 flex items-center justify-between gap-2 md:top-6 md:right-6 md:left-6">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-bold text-foreground"><Flame className="size-3.5 text-accent" aria-hidden />{curated ? "오늘의 음식" : "오늘 가장 많이 찾은 음식, 1위"}</span>
              {top.editorial && <span className="rounded-full bg-primary px-2.5 py-1.5 text-xs text-primary-foreground">{top.generatedImage ? "AI 생성 예시" : "참고 사진"}</span>}
            </div>
            <div className="flex flex-1 flex-col items-start justify-center gap-3 p-5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-6">
              <h1 className="max-w-[12em] text-feature-mobile leading-[1.12] font-black tracking-[-0.04em] md:text-feature">{top.name}</h1>
              <Link href={`/food/${top.slug}`} className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-full bg-card px-4 text-sm font-bold text-foreground hover:bg-secondary hover:text-foreground">
                {top.kind === "discovery" ? "음식 알아보기" : top.kind === "product" ? "제품 알아보기" : "레시피 보기"}<ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </section>
          <section aria-label="함께 둘러볼 음식" className="grid grid-cols-2 gap-4 md:grid-cols-1 md:grid-rows-2 md:gap-6">
            {spotlights.map((food) => <Link key={food.slug} href={`/food/${food.slug}`} className="group flex min-w-0 flex-col overflow-hidden rounded-3xl bg-card text-foreground hover:text-foreground md:flex-row">
              {food.imageAvailable && <div className="relative aspect-[3/2] shrink-0 overflow-hidden bg-secondary md:aspect-auto md:w-[44%]">
                <FoodImage food={food} sizes="(max-width: 767px) 50vw, 200px" />
                {food.editorial && <span className="absolute bottom-2 left-2 rounded-sm bg-primary px-2 py-1 text-xs text-primary-foreground">{food.generatedImage ? "AI 생성 예시" : "참고 사진"}</span>}
              </div>}
              <div className="flex flex-1 flex-col items-start justify-center gap-1.5 p-3 md:gap-3 md:p-5">
                <span className="text-xs font-bold text-accent">{food.category}</span>
                <h2 className="text-lg leading-snug font-bold tracking-tight group-hover:underline md:text-2xl">{food.name}</h2>
                <p className="hidden text-sm leading-relaxed text-muted-foreground md:line-clamp-2">{food.why}</p>
                <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">{food.kind === "discovery" ? "음식 소개" : food.kind === "product" ? "완제품 안내" : `${food.cookMinutes}분 레시피`}<ArrowUpRight className="size-4" aria-hidden /></span>
              </div>
            </Link>)}
          </section>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="max-w-[65em] text-xs leading-relaxed text-muted-foreground">
            {recommendation && <p data-testid="recommendation-edition">추천 갱신 {recommendation.date} · {recommendation.basis === "new" ? "새로 추가한 음식" : recommendation.basis === "trend" ? "검색 흐름을 참고한 추천" : "기존 음식 돌아보기"}</p>}
            <p>{curated ? `출처 확인 ${top.editorial!.checkedAt} · 실시간 순위 집계 전 · ${top.kind === "discovery" ? "AI 음식 소개" : "AI 조리 안내"}` : "AI 요약, 운영자 검수 완료. 데모 사진"}</p>
          </div>
          <a href="#list" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-foreground hover:text-accent">음식 둘러보기 <ArrowUpRight className="size-5 text-accent" aria-hidden /></a>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-5">
        <section aria-label="필터 설정" className="sticky top-0 z-20 flex min-h-20 items-center gap-3 border-y bg-background py-3">
          <nav aria-label="카테고리" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:thin]">
            {[...tabs, "찜" as const].map((t) => {
              const Icon = tabIcons[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-current={tab === t ? "true" : undefined}
                  onClick={() => pickTab(t)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-left text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-secondary md:gap-2 md:px-4",
                    tab === t && "bg-primary font-bold text-primary-foreground hover:bg-primary",
                  )}
                >
                  <Icon className="hidden size-4 md:block" aria-hidden />
                  <span>{t === "찜" ? "찜한 음식" : t}</span>
                  <span className="text-xs tabular-nums">{counts[t] ?? 0}</span>
                </button>
              );
            })}
          </nav>
          <button type="button" aria-expanded={filtersOpen} aria-controls="food-filters" onClick={() => setFiltersOpen(!filtersOpen)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-input bg-card px-3 text-sm font-bold hover:bg-secondary md:px-4">
            <SlidersHorizontal className="size-4" aria-hidden />필터<ChevronDown className={cn("hidden size-4 md:block", filtersOpen && "rotate-180")} aria-hidden />
          </button>
        </section>
        <div>
        <aside id="food-filters" aria-label="음식 필터" hidden={!filtersOpen} className="min-w-0 border-b bg-card px-4 py-2 md:px-6">
            {(curated || year === null) && <nav aria-label="정렬과 태그" className="flex flex-wrap items-center gap-2 py-3">
              {sortOptions.filter((s) => !curated || s !== "좋아요순").map((s) => (
                <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={chipClass}>
                  {curated && s === "급상승순" ? "추천순" : s}
                </button>
              ))}
              <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
              {tagOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={cn(chipClass, "lg:px-3")}
                >
                  #{t}
                </button>
              ))}
            </nav>}
            {years.length > 0 && <nav aria-label="유행 연도" className="flex flex-wrap items-center gap-2 border-t py-3">
              <button type="button" aria-pressed={year === null} onClick={() => setYear(null)} className={chipClass}>전체 연도</button>
              {years.map((y) => <button key={y} type="button" aria-pressed={year === y} onClick={() => { setYear(y); toList(); }} className={cn(chipClass, "lg:px-2")}>{y}년</button>)}
            </nav>}
            {!curated && <YearFilter year={year} onChange={pickYear} onClear={() => setYear(null)} />}
        </aside>

        <div className="min-w-0">
          <main id="list" ref={listRef} className="scroll-mt-24 pt-6 pb-14">
            <div aria-live="polite" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-2xl font-black tracking-tight">{!curated && year !== null ? `${year}년 유행 음식` : title}</h2>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-sm font-bold text-muted-foreground">{!curated && year !== null ? history.length : list.length}개</span>
              {filtering && (
                <button type="button" onClick={reset} className="min-h-11 text-sm font-bold text-accent underline">
                  전체 보기
                </button>
              )}
            </div>
            {curated && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">기사·공식 자료에서 주목받은 시기를 기록했어요. 유행 연도가 없는 항목은 일상 레시피예요.</p>}
            {!curated && year !== null ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">당시 보도로 살펴본 유행 음식이에요. 순위가 아닌 대표 사례이며, 연도는 유행이 확인된 시기를 뜻해요.</p>
                <ul className="m-0 list-none divide-y p-0">
                  {history.map((item) => (
                    <li key={item.name} className="flex flex-col gap-3 py-6">
                      <span className="text-sm font-bold text-accent">{item.year}년</span>
                      <h3 className="text-2xl font-black">{item.name}</h3>
                      <p className="text-base leading-relaxed text-body">{item.summary}</p>
                      <span className="text-xs text-muted-foreground">AI 요약</span>
                      <div className="flex flex-wrap items-center gap-4">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold underline">출처: {item.source}<span className="sr-only"> (새 창)</span></a>
                        {item.recipeSlug && foods.some((food) => food.slug === item.recipeSlug) && <Link href={`/food/${item.recipeSlug}`} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:text-primary-foreground">레시피 보기</Link>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-base text-body">
                  {tab === "찜" ? "아직 찜한 음식이 없어요. 음식 옆 하트를 눌러 보세요." : "맞는 음식이 없어요. 다른 말로 찾아보세요."}
                </p>
                <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-primary px-5 font-bold text-white">
                  전체 순위 보기
                </button>
              </div>
            ) : (
              <ol className="food-grid m-0 mt-5 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 pb-8 md:gap-x-6 md:gap-y-10 lg:grid-cols-3">
                {list.map((food, i) => (
                  <Fragment key={food.slug}>
                    <FoodCard food={food} />
                    {i === 5 && list.length > 6 && (
                      <li className="col-span-full list-none">
                        <AdSlot label="인피드" className="my-7 h-[130px]" />
                      </li>
                    )}
                  </Fragment>
                ))}
              </ol>
            )}
            {!filtering && !curated && (
              <p className="mt-7 flex min-h-14 w-full items-center justify-center rounded-xl border-[1.5px] border-primary text-base font-bold">
                11위부터는 트렌드 수집이 연결되면 보여요
              </p>
            )}
          </main>
        </div>
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
