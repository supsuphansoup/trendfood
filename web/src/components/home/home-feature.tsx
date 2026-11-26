import { ArrowDown, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, type PointerEvent, useLayoutEffect, useRef, useState } from "react";
import { FoodImage } from "@/components/food-image";
import { FoodVideo } from "@/components/food-video";
import { foodVideoId } from "@/data/youtube";
import type { Food } from "@/lib/foods";

export function HomeFeature({ foods, curated }: { foods: Food[]; curated: boolean }) {
  const [selected, setSelected] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  const pendingSlide = useRef<{ before: Map<string, DOMRect>; direction: number } | null>(null);
  const dragStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const move = (direction: number) => {
    if (foods.length < 2) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && carousel.current) {
      const before = new Map<string, DOMRect>();
      for (const poster of carousel.current.querySelectorAll<HTMLElement>("[data-poster]")) {
        const image = poster.querySelector("img");
        if (image && poster.dataset.poster) before.set(poster.dataset.poster, image.getBoundingClientRect());
      }
      pendingSlide.current = { before, direction };
    }
    setSelected((current) => (current + direction + foods.length) % foods.length);
  };

  useLayoutEffect(() => {
    const slide = pendingSlide.current;
    pendingSlide.current = null;
    if (!slide || !carousel.current) return;
    const animations: Animation[] = [];
    for (const poster of carousel.current.querySelectorAll<HTMLElement>("[data-poster]")) {
      const image = poster.querySelector("img");
      const from = poster.dataset.poster && slide.before.get(poster.dataset.poster);
      if (!image || !from || !from.width || !from.height) continue;
      const to = image.getBoundingClientRect();
      if (!to.width || !to.height) continue;
      let dx = from.left + from.width / 2 - (to.left + to.width / 2);
      // 끝에서 반대편으로 순환하는 이웃 사진은 바깥에서 들어온다.
      if (dx * slide.direction < -poster.offsetWidth) dx = slide.direction * poster.offsetWidth;
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      animations.push(image.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})` },
        { transform: "none" },
      ], { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
    }
    return () => { for (const animation of animations) animation.cancel(); };
  }, [selected]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".home-poster-image")) return;

    dragStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    target.setPointerCapture(event.pointerId);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (start?.id !== event.pointerId) return;
    dragStart.current = null;

    const horizontal = event.clientX - start.x;
    const vertical = event.clientY - start.y;
    if (Math.abs(horizontal) < 45 || Math.abs(horizontal) <= Math.abs(vertical)) return;

    suppressClick.current = true;
    move(horizontal < 0 ? 1 : -1);
  };

  const preventDragClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail === 0 || !suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

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
        <Link
          href="#list"
          onNavigate={() => document.getElementById("list")?.focus({ preventScroll: true })}
          className="motion-press inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-meta font-semibold text-body hover:text-destructive hover:underline"
        >
          음식 목록 <ArrowDown className="size-4" aria-hidden />
        </Link>
        <p className="basis-full text-base leading-normal text-body">유행의 배경부터 만드는 법까지.</p>
      </header>
      <div
        ref={carousel}
        className="home-poster-carousel mt-4 md:mt-6"
        onPointerDown={startDrag}
        onPointerUp={finishDrag}
        onPointerCancel={() => { dragStart.current = null; }}
        onClickCapture={preventDragClick}
        onDragStart={(event) => event.preventDefault()}
      >
        <section aria-label="트렌드 추천 순위" className="home-poster-sides">
          {foods.map((food, index) => {
            if (index === selected) return null;
            const side = index === (selected + 1) % foods.length ? "next" : "previous";
            return <button key={food.slug} type="button" aria-controls="featured-trend-food" onClick={() => move(side === "next" ? 1 : -1)} className={`home-poster-side home-poster-${side} text-foreground`}>
              <span className="sr-only">{index + 1}위 </span>
              <span aria-hidden="true" className="home-poster-image relative block">
                <span className="home-poster-photo" data-poster={food.slug}><FoodImage food={food} contain sizes="(min-width: 768px) 540px, 74vw" /></span>
              </span>
              <span className="home-poster-side-caption sr-only lg:not-sr-only lg:mt-4 lg:block">
                <span className="block text-xl font-bold md:text-2xl">{food.name}</span>
                <span className="mt-2 block text-meta text-muted-foreground">{food.kind === "discovery" ? "음식 소개" : "레시피"} · {food.category}</span>
              </span>
            </button>;
          })}
        </section>
      <section id="featured-trend-food" aria-label={curated ? "오늘의 음식" : `오늘의 ${selected + 1}위`} className="home-poster-active relative text-center text-foreground">
        <figure className="home-poster-image relative">
          <Link key={top.slug} href={href} data-poster={top.slug} aria-label={`${top.name} 상세 보기`} className="home-poster-photo rounded-2xl focus-visible:-outline-offset-4 md:rounded-3xl">
            <FoodImage food={top} hero contain preload={selected === 0} sizes="(min-width: 768px) 540px, 74vw" />
          </Link>
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
        <button type="button" aria-label="이전 추천 음식" onClick={() => move(-1)} className="pointer-events-auto flex size-11 items-center justify-center rounded-full border bg-background text-foreground"><ChevronLeft aria-hidden className="size-5" /></button>
        <button type="button" aria-label="다음 추천 음식" onClick={() => move(1)} className="pointer-events-auto flex size-11 items-center justify-center rounded-full border bg-background text-foreground"><ChevronRight aria-hidden className="size-5" /></button>
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
