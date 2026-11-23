import { ArrowDown, ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { FoodImage } from "@/components/food-image";
import { FoodVideo } from "@/components/food-video";
import { foodVideoId } from "@/data/youtube";
import type { Food } from "@/lib/foods";

export function HomeFeature({ foods, curated }: { foods: Food[]; curated: boolean }) {
  const [selected, setSelected] = useState(0);
  const activeRank = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    // 대표 영역 높이가 달라져도 방금 누른 순위를 화면 안에 둔다.
    activeRank.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    activeRank.current = null;
  }, [selected]);

  const top = foods[selected] ?? foods[0];
  const recommendation = top.editorial?.recommendation;
  const videoId = foodVideoId(top);
  const href = `/food/${top.slug}`;
  const context = !curated ? "오늘 가장 많이 찾은 음식"
    : selected === 0 && recommendation?.basis === "new" ? "새로 소개하는 음식"
    : selected === 0 && recommendation?.basis === "trend" ? "검색 흐름으로 살펴본 음식"
    : top.history ? "다시 보는 유행" : "오늘 살펴볼 음식";

  return (
    <div className="home-feature mx-auto w-full max-w-[1200px] px-5 pt-4 pb-2 max-[360px]:pt-3 md:pt-6">
      <header className="home-feature-heading flex flex-wrap items-center justify-between gap-x-2 text-foreground">
        <h1 className="text-2xl leading-tight font-bold tracking-tight md:text-intro-mobile">유행 음식과 집밥</h1>
        <a href="#list" className="motion-press inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-meta font-semibold text-body hover:text-destructive hover:underline">
          음식 목록 <ArrowDown className="size-4" aria-hidden />
        </a>
        <p className="basis-full text-base leading-normal text-body">유행의 배경부터 만드는 법까지.</p>
      </header>
      <section id="featured-trend-food" aria-label={curated ? "오늘의 음식" : `오늘의 ${selected + 1}위`} className="home-feature-preview mt-4 grid min-w-0 items-center gap-4 text-foreground md:mt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-6 lg:gap-10">
        <div className="home-feature-story min-w-0 only:col-span-full">
          <div aria-live="polite">
            <h2 key={top.slug} className="motion-copy text-3xl leading-tight font-extrabold tracking-tight wrap-anywhere lg:text-stage-tablet">{top.name}</h2>
          </div>
          <p key={`${top.slug}-context`} className="motion-copy mt-1 text-meta leading-snug wrap-anywhere text-muted-foreground">
            {context}{top.history?.years.map((year) => ` · ${year}년`)}
          </p>
          <p key={`${top.slug}-description`} data-testid="feature-description" className="home-feature-summary motion-copy mt-2 max-w-[26em] text-base leading-relaxed wrap-anywhere text-body lg:mt-3 lg:text-reading">{(top.history?.note ?? top.why).split(/(?<=[.!?])\s+/)[0]}</p>
          <div className="home-feature-actions mt-3 flex flex-wrap items-center gap-2 lg:mt-5">
            <Link href={href} className="motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-meta font-bold text-primary-foreground hover:bg-destructive md:min-h-12 md:px-4">
              음식 살펴보기 <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            {videoId && <FoodVideo key={top.slug} name={top.name} videoId={videoId} variant="outline" />}
          </div>
        </div>
        {top.imageAvailable && <figure className="home-feature-photo overflow-hidden rounded-photo bg-secondary">
          <Link key={top.slug} href={href} aria-label={`${top.name} 상세 보기`} className="food-image-link motion-feature block focus-visible:-outline-offset-4">
            <FoodImage food={top} hero fullFrame preload={selected === 0} sizes="(min-width: 1200px) 640px, (min-width: 768px) 55vw, calc(100vw - 40px)" />
          </Link>
        </figure>}
      </section>
      <section aria-label="트렌드 추천 순위" className="home-feature-ranks mt-3 min-w-0 md:mt-4">
        <ol className="home-rank-tabs relative grid list-none grid-cols-3 border-b p-0" style={{ "--rank-offset": `${selected * 100}%` } as CSSProperties}>
          {foods.map((food, index) => (
            <li key={food.slug} className="min-w-0">
              <button
                type="button"
                aria-pressed={selected === index}
                aria-controls="featured-trend-food"
                onClick={(event) => {
                  if (selected === index) return;
                  activeRank.current = event.currentTarget;
                  setSelected(index);
                }}
                className="motion-press flex h-full min-h-12 w-full min-w-0 flex-col items-center justify-center gap-x-2 gap-y-0.5 border-b-2 border-transparent px-1 py-2 text-center text-body hover:bg-muted focus-visible:-outline-offset-2 aria-pressed:font-bold aria-pressed:text-destructive max-[360px]:justify-start sm:flex-row sm:px-3"
              >
                <span className="shrink-0 text-meta leading-none font-semibold tabular-nums">{`${index + 1}위`}</span>
                <span className="min-w-0 text-base leading-tight wrap-anywhere">{food.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <details aria-label="추천과 출처 안내" className="group mt-1 text-meta leading-relaxed text-muted-foreground">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 focus-visible:rounded-md [&::-webkit-details-marker]:hidden">
          <span>{curated ? "AI 안내·출처 정보" : "예시 데이터 안내"}</span><ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="motion-reveal grid gap-x-8 gap-y-2 pt-1 pb-4 md:grid-cols-3">
          {recommendation && <p data-testid="recommendation-edition">추천 갱신 {recommendation.date}<br />{recommendation.basis === "new" ? "새로 추가한 음식" : recommendation.basis === "trend" ? "검색 흐름을 참고한 추천" : "기존 음식 돌아보기"}</p>}
          <p>{curated ? `출처 확인 ${top.editorial!.checkedAt}` : "AI 요약, 운영자 검수 완료. 데모 사진"}</p>
          {curated && <p>{top.kind === "discovery" ? "AI 음식 소개" : "AI 조리 안내"}<br />추천 순서는 확인된 유행 기록을 바탕으로 정해요. 실시간 인기 순위가 아니에요.</p>}
        </div>
      </details>
    </div>
  );
}
