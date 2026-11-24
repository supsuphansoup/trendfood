import { ArrowDown, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FoodImage } from "@/components/food-image";
import { FoodVideo } from "@/components/food-video";
import { foodVideoId } from "@/data/youtube";
import type { Food } from "@/lib/foods";

export function HomeFeature({ foods, curated }: { foods: Food[]; curated: boolean }) {
  const [selected, setSelected] = useState(0);

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
      <div className="home-poster-carousel mt-4 md:mt-6">
        <section aria-label="트렌드 추천 순위" className="home-poster-sides">
          {foods.map((food, index) => {
            if (index === selected) return null;
            const side = index === (selected + 1) % foods.length ? "next" : "previous";
            return <button key={food.slug} type="button" aria-controls="featured-trend-food" onClick={() => setSelected(index)} className={`home-poster-side home-poster-${side} text-foreground`}>
              <span className="sr-only">{index + 1}위 </span>
              <span aria-hidden="true" className="home-poster-image relative block overflow-hidden rounded-3xl bg-secondary">
                <FoodImage food={food} sizes="(min-width: 768px) 380px, 70vw" />
                <span className="home-poster-rank absolute bottom-4 left-5 text-hero font-extrabold italic leading-none text-primary-foreground" aria-hidden>{index + 1}</span>
              </span>
              <span className="mt-4 block text-xl font-bold md:text-2xl">{food.name}</span>
              <span className="mt-2 block text-meta text-muted-foreground">{food.kind === "discovery" ? "음식 소개" : "레시피"} · {food.category}</span>
            </button>;
          })}
        </section>
      <section id="featured-trend-food" aria-label={curated ? "오늘의 음식" : `오늘의 ${selected + 1}위`} className="home-poster-active relative text-center text-foreground">
        <figure className="home-poster-image relative overflow-hidden rounded-3xl bg-secondary">
          <Link key={top.slug} href={href} aria-label={`${top.name} 상세 보기`} className="food-image-link block h-full focus-visible:-outline-offset-4">
            <FoodImage food={top} hero preload={selected === 0} sizes="(min-width: 768px) 400px, 70vw" />
          </Link>
          <span className="home-poster-rank pointer-events-none absolute bottom-4 left-5 text-hero font-extrabold italic leading-none text-primary-foreground" aria-label={`${selected + 1}위`}>{selected + 1}</span>
        </figure>
        <div className="home-feature-story mt-4 min-w-0">
          <div aria-live="polite">
            <h2 key={top.slug} className="motion-copy text-2xl leading-tight font-extrabold tracking-tight wrap-anywhere md:text-card-grid-title">{top.name}</h2>
          </div>
          <p key={`${top.slug}-context`} className="motion-copy mt-1 text-meta leading-snug wrap-anywhere text-muted-foreground">
            {context}{top.history?.years.map((year) => ` · ${year}년`)}
          </p>
          <p key={`${top.slug}-description`} data-testid="feature-description" className="home-feature-summary motion-copy mt-2 text-base leading-relaxed wrap-anywhere text-body lg:text-reading">{(top.history?.note ?? top.why).split(/(?<=[.!?])\s+/)[0]}</p>
          <div className="home-feature-actions mt-3 flex flex-wrap items-center justify-center gap-2">
            <Link href={href} className="motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-meta font-bold text-primary-foreground hover:bg-destructive md:min-h-12 md:px-4">
              음식 살펴보기 <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            {videoId && <FoodVideo key={top.slug} name={top.name} videoId={videoId} variant="outline" />}
          </div>
        </div>
      </section>
      <nav aria-label="추천 음식 넘기기" className="home-poster-controls pointer-events-none absolute inset-x-2 z-10 flex items-center justify-between">
        <button type="button" aria-label="이전 추천 음식" onClick={() => setSelected((selected + foods.length - 1) % foods.length)} className="pointer-events-auto flex size-11 items-center justify-center rounded-full border bg-background text-foreground"><ChevronLeft aria-hidden className="size-5" /></button>
        <button type="button" aria-label="다음 추천 음식" onClick={() => setSelected((selected + 1) % foods.length)} className="pointer-events-auto flex size-11 items-center justify-center rounded-full border bg-background text-foreground"><ChevronRight aria-hidden className="size-5" /></button>
      </nav>
      </div>
      <p className="mt-2 text-center text-meta tabular-nums" aria-live="polite">{selected + 1} / {foods.length}</p>
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
