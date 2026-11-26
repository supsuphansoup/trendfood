import { ArrowDown, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type MouseEvent, type PointerEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FoodImage } from "@/components/food-image";
import { FoodVideo } from "@/components/food-video";
import { foodVideoId } from "@/data/youtube";
import type { Food } from "@/lib/foods";

const rotationDelay = 8000;
const motionQuery = "(prefers-reduced-motion: reduce)";
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getPageVisible = () => !document.hidden;
const getServerSnapshot = () => false;

function subscribeToMotion(change: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
}

function subscribeToVisibility(change: () => void) {
  document.addEventListener("visibilitychange", change);
  return () => document.removeEventListener("visibilitychange", change);
}

export function HomeFeature({ foods, curated }: { foods: Food[]; curated: boolean }) {
  const count = foods.length;
  const multiple = count > 1;
  const [{ position, instant }, setSlide] = useState({ position: 1, instant: false });
  const [rotation, setRotation] = useState<boolean | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerSnapshot);
  const visible = useSyncExternalStore(subscribeToVisibility, getPageVisible, getServerSnapshot);
  const rotationButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const selected = (position + count - 1) % count;
  const automatic = rotation ?? !reduced;
  const rotating = multiple && automatic && visible;

  const move = useCallback((direction: number) => {
    if (!multiple) return;
    setSlide((current) => {
      const target = current.position + direction;
      if (!reduced && target >= 0 && target <= count + 1) {
        return { position: target, instant: false };
      }
      return { position: ((target + count - 1) % count) + 1, instant: true };
    });
  }, [count, multiple, reduced]);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => move(1), rotationDelay);
    return () => window.clearTimeout(timer);
  }, [move, selected, rotating]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!multiple || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("button, dialog, .home-hero-actions")) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  };

  const updateDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start?.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (!start.horizontal) {
      if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(event.clientY - start.y)) return;
      start.horizontal = true;
      suppressClick.current = true;
      setRotation(false);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "";
    }
    if (!reduced) event.currentTarget.style.setProperty("--hero-drag", `${dx}px`);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = drag.current;
    if (start?.id !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    event.currentTarget.style.removeProperty("--hero-drag");
    const distance = event.clientX - start.x;
    if (!cancelled && start.horizontal && Math.abs(distance) >= 45) move(distance < 0 ? 1 : -1);
  };

  const preventDragClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail === 0 || !suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const top = foods[selected];
  const recommendation = top.editorial?.recommendation;
  // 양 끝에 한 장씩 두고, 이동이 끝나면 화면에 변화 없이 원래 위치로 맞춘다.
  const slides = multiple ? [foods[count - 1], ...foods, foods[0]] : foods;

  return (
    <>
      <section
        aria-labelledby="home-hero-title"
        aria-roledescription="캐러셀"
        className="home-hero"
        onFocusCapture={(event) => {
          if (event.target !== rotationButton.current || event.target.matches(":focus-visible")) setRotation(false);
        }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (!multiple || (event.target instanceof Element && event.target.closest("dialog"))) return;
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          setRotation(false);
          move(event.key === "ArrowLeft" ? -1 : 1);
        }}
      >
        <header className="home-hero-identity">
          <h1 id="home-hero-title">유행 음식과 집밥</h1>
          <p>왜 유행했는지, 집에서 만드는 법까지.</p>
        </header>
        <div className="home-hero-tools">
          <Link href="#list" onNavigate={() => document.getElementById("list")?.focus({ preventScroll: true })} className="home-hero-list">
            음식 목록 <ArrowDown className="size-4" aria-hidden />
          </Link>
          {multiple && (
            <nav aria-label="추천 음식 넘기기" className="home-hero-controls">
              <button ref={rotationButton} aria-label={automatic ? "자동 넘김 일시정지" : "자동 넘김 시작"} type="button" onClick={() => setRotation(!automatic)}>
                {automatic ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
              <button type="button" aria-label="이전 추천 음식" onClick={() => { setRotation(false); move(-1); }}>
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button type="button" aria-label="다음 추천 음식" onClick={() => { setRotation(false); move(1); }}>
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </nav>
          )}
          <span aria-live={rotating ? "off" : "polite"} aria-atomic="true" className="sr-only">{top.name} {selected + 1}위</span>
        </div>
        <div
          className="home-hero-viewport"
          onPointerDown={startDrag}
          onPointerMove={updateDrag}
          onPointerUp={finishDrag}
          onPointerCancel={(event) => finishDrag(event, true)}
          onLostPointerCapture={(event) => { if (event.target === event.currentTarget) finishDrag(event, true); }}
          onClickCapture={preventDragClick}
          onDragStart={(event) => event.preventDefault()}
        >
          <div
            className="home-hero-track"
            data-instant={instant || undefined}
            style={{ "--hero-position": `${multiple ? -position * 100 : 0}%` } as CSSProperties}
            onTransitionEnd={(event) => {
              if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
              if (position === 0 || position === count + 1) {
                setSlide({ position: position === 0 ? count : 1, instant: true });
              }
            }}
          >
            {slides.map((food, slideIndex) => {
              const rank = multiple ? ((slideIndex + count - 1) % count) + 1 : 1;
              const active = slideIndex === (multiple ? position : 0);
              const href = `/food/${food.slug}`;
              const context = !curated ? "오늘 가장 많이 찾은 음식"
                : food.rank === 1 && food.editorial?.newlyAdded && food.editorial.recommendation?.basis === "new" ? "새로 소개하는 음식"
                : food.rank === 1 && food.editorial?.recommendation?.basis === "trend" ? "검색 흐름으로 살펴본 음식"
                : food.history ? "다시 보는 유행" : "오늘 살펴볼 음식";
              const videoId = foodVideoId(food);
              return (
                <section key={slideIndex} inert={!active} aria-hidden={!active || undefined} id={active ? "featured-trend-food" : undefined} aria-label={curated ? "오늘의 음식" : `오늘의 ${rank}위`} className="home-hero-slide">
                  {food.imageAvailable && (
                    <figure className="home-hero-photo">
                      <Link href={href} aria-label={`${food.name} 상세 보기`} className="absolute inset-0 focus-visible:-outline-offset-4">
                        <FoodImage food={food} hero fit="cover" preload={slideIndex === (multiple ? 1 : 0)} eager sizes="100vw" />
                      </Link>
                    </figure>
                  )}
                  <div className="home-hero-copy">
                    <p className="text-meta font-semibold">{context}{food.history?.years.map((year) => ` · ${year}년`)}</p>
                    <div className="home-hero-title-row">
                      <h2>{food.name}</h2>
                      <span className="home-hero-rank">{rank}위</span>
                    </div>
                    <p data-testid="feature-description" className="home-hero-reason">{(food.history?.note ?? food.why).split(/(?<=[.!?])\s+/)[0]}</p>
                    {food.kind !== "discovery" && food.kind !== "product" && (
                      <p className="mt-2 text-meta font-medium">{[food.cookLabel, food.difficulty, food.servings].filter(Boolean).join(" · ")}</p>
                    )}
                    <div className="home-hero-actions mt-4 flex flex-wrap gap-2">
                      <Link href={href} className="motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-background px-3 text-meta font-bold text-foreground md:px-4">
                        음식 살펴보기 <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                      {videoId && <FoodVideo name={food.name} videoId={videoId} variant="outline" />}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
      <details aria-label="추천과 출처 안내" className="group mx-auto w-full max-w-[1200px] px-5 text-meta leading-relaxed text-muted-foreground">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 focus-visible:rounded-md [&::-webkit-details-marker]:hidden">
          <span>{curated ? "AI 안내·출처 정보" : "예시 데이터 안내"}</span><ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="motion-reveal grid gap-x-8 gap-y-2 pt-1 pb-4 md:grid-cols-3">
          {recommendation && <p data-testid="recommendation-edition">추천 갱신 {recommendation.date}<br />{recommendation.basis === "new" ? "새로 추가한 음식" : recommendation.basis === "trend" ? "검색 흐름을 참고한 추천" : "기존 음식 돌아보기"}</p>}
          <p>{curated ? `출처 확인 ${top.editorial!.checkedAt}` : "AI 요약, 운영자 검수 완료. 데모 사진"}</p>
          {curated && <p>{top.kind === "discovery" ? "AI 음식 소개" : "AI 조리 안내"}<br />추천 순서는 확인된 유행 기록을 바탕으로 정해요. 실시간 인기 순위가 아니에요.</p>}
        </div>
      </details>
    </>
  );
}
