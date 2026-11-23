"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Heart,
  Search,
  SlidersHorizontal,
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
import { LIKES_KEY, PANTRY_KEY, useStoredSet } from "@/lib/use-stored-set";
import { recentlyPublished } from "@/data/freshness";
import { pantryMatch } from "@/data/recipe-tools";
import { PantryFinder } from "@/components/home/pantry-finder";
import { track } from "@/lib/analytics";

type Sort = (typeof sortOptions)[number];
type Tab = "전체" | (typeof categoryOptions)[number] | "찜";
type Collection = "all" | "recent" | "trends" | "everyday";

const collections: { value: Collection; label: string }[] = [
  { value: "all", label: "전체 음식" },
  { value: "recent", label: "최근 발견" },
  { value: "trends", label: "유행 기록" },
  { value: "everyday", label: "일상 레시피" },
];

function matchesCollection(food: Food, collection: Collection, today = "") {
  if (collection === "all") return true;
  if (collection === "recent") return recentlyPublished(food, today);
  if (collection === "trends") return !!food.history?.years.length || food.kind === "discovery";
  return !food.history?.years.length && (!food.kind || food.kind === "recipe");
}

const tabs: Tab[] = ["전체", ...categoryOptions.filter((category) => category !== "간식")];
const categoryTabs: (Tab | "자취 요리")[] = ["전체", "자취 요리", ...tabs.slice(1), "찜"];

const chipClass =
  "min-h-11 shrink-0 rounded-md border border-transparent bg-muted px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:border-line-strong aria-pressed:bg-accent aria-pressed:font-bold aria-pressed:text-accent-foreground";

/** 주소의 필터를 보존해 뒤로가기·공유 때 같은 목록을 보여준다. */
function readUrl(years: number[]) {
  const p = new URLSearchParams(window.location.search);
  const cat = p.get("cat");
  const sort = p.get("sort");
  const tag = p.get("tag");
  const year = Number(p.get("year"));
  const collection = collections.some(({ value }) => value === p.get("collection")) ? p.get("collection") as Collection : "all";
  return {
    collection,
    pantry: p.get("pantry") === "1",
    tab: ([...tabs, "찜"] as string[]).includes(cat ?? "") ? (cat as Tab) : "전체",
    sort: (sortOptions as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "급상승순",
    tag: (tagOptions as readonly string[]).includes(tag ?? "") ? tag : null,
    q: p.get("q") ?? "",
    year: collection === "everyday" ? null : years.length ? (years.includes(year) ? year : null) : (Number.isInteger(year) && year >= 2010 && year <= 2025 ? year : null),
  };
}

export function HomeFeed({ foods, today }: { foods: Food[]; today: string }) {
  const top = foods[0];
  const recommendation = top.editorial?.recommendation;
  const curated = foods.every((food) => food.editorial);
  const years = useMemo(() => [...new Set(foods.flatMap((food) => food.history?.years ?? []))].sort((a, b) => a - b), [foods]);
  const [year, setYear] = useState<number | null>(null);
  const [collection, setCollection] = useState<Collection>("all");
  const [tab, setTab] = useState<Tab>("전체");
  const [sort, setSort] = useState<Sort>("급상승순");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [showTop, setShowTop] = useState(false);
  const [ready, setReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const likes = useStoredSet(LIKES_KEY);
  const pantry = useStoredSet(PANTRY_KEY);
  const need = useStoredSet("tf:need");
  const [pantryActive, setPantryActive] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // 처음 열 때 주소의 필터를 읽는다
  useEffect(() => {
    const s = readUrl(years);
    /* eslint-disable react-hooks/set-state-in-effect -- 브라우저 주소는 첫 렌더 뒤에만 읽을 수 있다 */
    setTab(s.tab);
    setCollection(curated || s.collection === "everyday" ? s.collection : "all");
    setSort(s.sort);
    setTag(s.tag);
    setQuery(s.q);
    setApplied(s.q);
    setYear(!curated && s.pantry ? null : s.year);
    setPantryActive(s.pantry);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onPop = () => {
      const n = readUrl(years);
      setTab(n.tab);
      setCollection(curated || n.collection === "everyday" ? n.collection : "all");
      setSort(n.sort);
      setTag(n.tag);
      setQuery(n.q);
      setApplied(n.q);
      setYear(!curated && n.pantry ? null : n.year);
      setPantryActive(n.pantry);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [years, curated]);

  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (collection !== "all") p.set("collection", collection);
    if (tab !== "전체") p.set("cat", tab);
    if (sort !== "급상승순") p.set("sort", sort);
    if (tag) p.set("tag", tag);
    if (applied.trim()) p.set("q", applied.trim());
    if (year !== null) p.set("year", String(year));
    if (pantryActive) p.set("pantry", "1");
    const next = p.size ? `?${p}` : window.location.pathname;
    if (next !== window.location.search && !(next === window.location.pathname && !window.location.search)) {
      window.history.pushState(null, "", next);
    }
  }, [ready, tab, sort, tag, applied, year, collection, pantryActive]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const counts = useMemo(() => {
    const visible = foods.filter((food) => matchesCollection(food, collection === "everyday" ? "all" : collection, today) && (!pantryActive || pantryMatch(food, pantry.items, need.items) !== null));
    const c: Record<string, number> = { 전체: visible.length, 찜: visible.filter((food) => likes.items.includes(food.slug)).length, "자취 요리": foods.filter((food) => matchesCollection(food, "everyday")).length };
    for (const f of visible) c[f.category] = (c[f.category] ?? 0) + 1;
    return c;
  }, [foods, likes.items, collection, today, pantryActive, pantry.items, need.items]);

  const q = applied.trim();
  const filtering = Boolean(q || tag || tab !== "전체" || year !== null || collection !== "all" || pantryActive);
  const history = trendHistory.filter((item) => item.year === year);

  const list = useMemo(() => {
    const filtered = foods.filter(
      (f) =>
        (filtering || f.rank > 1) &&
        (tab === "전체" || (tab === "찜" ? likes.items.includes(f.slug) : f.category === tab)) &&
        (!tag || f.tags.includes(tag)) &&
        (!curated || !year || f.history?.years.includes(year)) &&
        matchesCollection(f, collection, today) &&
        (!pantryActive || pantryMatch(f, pantry.items, need.items) !== null) &&
        (!q || f.name.includes(q) || f.ingredients.some((i) => i.name.includes(q)) || f.why.includes(q) || f.history?.note.includes(q)),
    );
    const by: Record<Sort, (a: Food, b: Food) => number> = {
      급상승순: (a, b) => a.rank - b.rank,
      좋아요순: (a, b) => b.likes - a.likes,
      조리시간순: (a, b) => (a.kind === "discovery" ? Infinity : a.cookMinutes) - (b.kind === "discovery" ? Infinity : b.cookMinutes),
    };
    return [...filtered].sort((a, b) => pantryActive ? pantryMatch(a, pantry.items, need.items)!.missing.length - pantryMatch(b, pantry.items, need.items)!.missing.length || by[sort](a, b) : by[sort](a, b));
  }, [foods, sort, tag, tab, likes.items, q, year, filtering, curated, collection, today, pantryActive, pantry.items, need.items]);

  /** 목록 위쪽이 화면 밖에 있으면 목록 처음으로 올려 준다 */
  const toList = () => {
    const el = listRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth" });
  };
  const pickTab = (t: Tab | "자취 요리") => {
    if (t === "자취 요리") {
      setCollection("everyday");
      setTab("전체");
      setYear(null);
      setTag(null);
      toList();
      return;
    }
    if (collection === "everyday") setCollection("all");
    if (!curated) setYear(null);
    setTab(t);
    toList();
  };
  const reset = () => {
    setPantryActive(false);
    setCollection("all");
    setYear(null);
    setTab("전체");
    setTag(null);
    setQuery("");
    setApplied("");
  };
  const pickYear = (value: number) => {
    setPantryActive(false);
    setYear(value);
    setTab("전체");
    setTag(null);
    setQuery("");
    setApplied("");
    toList();
  };

  const title = [tab === "전체" ? (collection === "everyday" ? "자취 요리" : curated ? collection === "all" ? "음식 둘러보기" : collections.find(({ value }) => value === collection)!.label : filtering ? "전체" : "2위부터") : tab === "찜" ? "찜한 음식" : tab, year && `${year}년 화제`, tag && `#${tag}`, q && `'${q}' 검색`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="border-b bg-card">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <Link href="/" onClick={reset} className="flex min-h-11 items-center gap-2 text-[22px] font-bold tracking-[-0.04em] text-foreground hover:text-accent md:text-2xl">
              <SiteLogo />
              트렌드푸드
            </Link>
            <form
              role="search"
              className="order-3 flex h-12 min-w-0 basis-full items-center gap-2 rounded-feature border border-input bg-background pr-1 pl-4 focus-within:border-accent md:order-2 md:ml-auto md:max-w-[380px] md:flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!curated) setYear(null);
                setApplied(query);
                track("search", { search_term: "redacted", query_length: query.trim().length });
                searchRef.current?.blur();
                listRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
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
              <button type="submit" aria-label="검색" className="flex size-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-secondary"><Search className="size-5" aria-hidden /></button>
            </form>
            <nav aria-label="바로가기" className="order-2 ml-auto flex items-center gap-1 text-sm md:order-3 md:ml-0 md:gap-2">
              <Link href="/about#partners" className="hidden min-h-11 items-center px-2.5 text-muted-foreground hover:text-foreground xl:inline-flex">
                제휴 안내
              </Link>
              <button
                type="button"
                aria-pressed={tab === "찜"}
                onClick={() => {
                  setCollection("all");
                  setYear(null);
                  setTab(tab === "찜" ? "전체" : "찜");
                  listRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex h-11 items-center gap-1.5 rounded-md px-3 font-bold text-foreground aria-pressed:bg-accent aria-pressed:text-white"
              >
                <Heart className="size-4" aria-hidden />
                <LikeCount />
              </button>
            </nav>
          </div>
      </header>

      <main>
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-4 pb-2 md:pt-7">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-6">
          <div className="flex flex-col items-start justify-center gap-4 rounded-feature bg-primary px-5 py-6 text-primary-foreground md:px-7 md:py-8 lg:gap-6 lg:px-9">
            <h1 className="text-stage-mobile leading-[1.06] font-black tracking-[-0.055em] lg:text-intro xl:text-hero-detail">
              유행 음식부터<br />집밥 레시피까지
            </h1>
            <p className="max-w-[22em] text-base leading-relaxed lg:text-reading">
              어떤 음식이 왜 유행했는지 보고, 집에서 만들고 싶은 메뉴의 재료와 조리법을 찾아보세요.
            </p>
            <a href="#list" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-foreground px-4 text-base font-bold text-primary hover:bg-accent-soft hover:text-destructive focus-visible:outline-primary-foreground md:min-h-12 md:px-5">
              음식 둘러보기 <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
          <section aria-label={curated ? "오늘의 음식" : "오늘의 1위"} className="min-w-0 self-center bg-feature-surface text-foreground">
            {top.imageAvailable && <figure className="overflow-hidden rounded-photo bg-secondary">
              <Link href={`/food/${top.slug}`} aria-label={`${top.name} 상세 보기`} className="block focus-visible:-outline-offset-4">
                <FoodImage food={top} hero fullFrame preload sizes="(max-width: 767px) calc(100vw - 40px), 640px" />
              </Link>
            </figure>}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 pt-3 md:gap-x-5 md:pt-4">
              <p className="col-span-full flex flex-wrap items-center gap-x-3 text-meta font-bold text-muted-foreground">
                <span>{curated ? recommendation?.basis === "new" ? "새로 소개하는 음식" : recommendation?.basis === "trend" ? "검색 흐름으로 살펴본 음식" : top.history ? "다시 보는 유행" : "오늘 살펴볼 음식" : "오늘 가장 많이 찾은 음식, 1위"}</span>
                {top.history && <span className="font-medium">{top.history.years.map((year) => `${year}년`).join(" · ")}</span>}
              </p>
              <h2 className="text-2xl leading-tight font-extrabold tracking-tight text-foreground lg:text-intro-mobile">{top.name}</h2>
              <Link href={`/food/${top.slug}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-bold text-foreground hover:border-primary hover:text-primary md:px-4">
                음식 살펴보기 <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              <p data-testid="feature-description" className="col-span-full max-w-[38em] text-reading leading-relaxed text-body">{(top.history?.note ?? top.why).split(/(?<=[.!?])\s+/)[0]}</p>
            </div>
          </section>
        </div>
        <details aria-label="추천과 출처 안내" className="group mt-3 border-t text-meta leading-relaxed text-muted-foreground">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 focus-visible:rounded-md [&::-webkit-details-marker]:hidden">
            <span>{curated ? "AI 안내·출처 정보" : "예시 데이터 안내"}</span><ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="grid gap-x-8 gap-y-2 pt-1 pb-4 md:grid-cols-3">
          {recommendation && <p data-testid="recommendation-edition">추천 갱신 {recommendation.date}<br />{recommendation.basis === "new" ? "새로 추가한 음식" : recommendation.basis === "trend" ? "검색 흐름을 참고한 추천" : "기존 음식 돌아보기"}</p>}
          <p>{curated ? `출처 확인 ${top.editorial!.checkedAt}` : "AI 요약, 운영자 검수 완료. 데모 사진"}</p>
          {curated && <p>{top.kind === "discovery" ? "AI 음식 소개" : "AI 조리 안내"}<br />실시간 인기 순위가 아닌 유행 기록이에요.</p>}
          </div>
        </details>
      </div>

      <div className="w-full border-t bg-feed-surface">
      <div className="mx-auto w-full max-w-[1200px] px-5">
        <section aria-label="필터 설정" className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-feed-surface">
          <nav aria-label="카테고리" className="flex min-w-0 flex-1 gap-4 overflow-x-auto md:gap-8 [scrollbar-width:thin]">
            {categoryTabs.map((t) => {
              const selected = t === "자취 요리" ? collection === "everyday" : collection !== "everyday" && tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => pickTab(t)}
                  className={cn(
                    "flex min-h-16 shrink-0 items-center gap-2 border-b-[3px] border-transparent px-1 text-left text-base font-semibold whitespace-nowrap text-body hover:text-foreground",
                    selected && "border-primary font-bold text-accent hover:text-accent",
                  )}
                >
                  <span>{t === "찜" ? "찜한 음식" : t}</span>
                  <span className="text-meta tabular-nums">{counts[t] ?? 0}</span>
                </button>
              );
            })}
          </nav>
          <button type="button" aria-expanded={filtersOpen} aria-controls="food-filters" onClick={() => setFiltersOpen(!filtersOpen)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-base font-bold hover:bg-secondary md:px-4">
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
            {collection !== "everyday" && years.length > 0 && <nav aria-label="유행 연도" className="flex flex-wrap items-center gap-2 border-t py-3">
              <button type="button" aria-pressed={year === null} onClick={() => setYear(null)} className={chipClass}>전체 연도</button>
              {years.map((y) => <button key={y} type="button" aria-pressed={year === y} onClick={() => { setYear(y); toList(); }} className={cn(chipClass, "lg:px-2")}>{y}년</button>)}
            </nav>}
            {!curated && collection !== "everyday" && <YearFilter year={year} onChange={pickYear} onClear={() => setYear(null)} />}
        </aside>

        <div className="min-w-0">
          <div id="list" ref={listRef} tabIndex={-1} className="scroll-mt-16 pt-6 pb-14">
            {curated && <nav aria-label="음식 모음" className="mb-4 flex flex-wrap gap-2">
              {collections.map(({ value, label }) => <button key={value} type="button" aria-pressed={collection === value} onClick={() => { if (value === "everyday") pickTab("자취 요리"); else { setCollection(value); toList(); } }} className="min-h-11 rounded-md border border-line-strong px-4 text-sm font-semibold text-foreground hover:bg-card aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background">{label}</button>)}
            </nav>}
            <PantryFinder foods={foods} active={pantryActive} onChange={(active) => { setPantryActive(active); if (active) setYear(null); }} />
            <div aria-live="polite" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-2xl font-bold tracking-tight">{pantryActive ? "보유 재료로 찾기" : !curated && year !== null ? `${year}년 유행 음식` : title}</h2>
              <span className="text-sm text-muted-foreground">{!curated && year !== null ? history.length : list.length}개</span>
              {filtering && (
                <button type="button" onClick={reset} className="min-h-11 text-sm font-bold text-accent underline">
                  전체 보기
                </button>
              )}
            </div>
            {(curated || collection === "everyday") && <p className="mt-1 max-w-[42em] text-meta leading-relaxed text-muted-foreground">{collection === "recent" ? "최근 30일 안에 서비스에 처음 등록한 음식이에요. 등록일은 유행 시작일과 달라요." : collection === "everyday" ? "유행 순위와 별개로, 집에서 해먹기 좋은 레시피를 모았어요." : "출처로 확인한 유행 시기예요. 현재 인기 순위와는 달라요."}</p>}
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
                  {tab === "찜" ? "아직 찜한 음식이 없어요. 음식 옆 하트를 눌러 보세요." : collection === "recent" && !q && !tag && tab === "전체" ? "최근 30일에 등록일이 확인된 새 음식이 없어요. 유행 기록과 전체 음식을 둘러보세요." : "맞는 음식이 없어요. 다른 말로 찾아보세요."}
                </p>
                <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-primary px-5 font-bold text-white">
                  {curated ? "전체 음식 보기" : "전체 순위 보기"}
                </button>
              </div>
            ) : (
              <ol className="food-grid m-0 mt-5 grid list-none gap-5 p-0 pb-8 md:grid-cols-2 md:gap-7">
                {list.map((food, i) => (
                  <Fragment key={food.slug}>
                    <FoodCard food={food} wide={i === 2 && list.length > 3} unranked={collection === "everyday" || pantryActive} match={pantryActive ? pantryMatch(food, pantry.items, need.items) : null} />
                    {i === 2 && list.length > 3 && (
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
          </div>
        </div>
        </div>
      </div>
      </div>
      </main>

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
