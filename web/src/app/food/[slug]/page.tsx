import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { FoodImage } from "@/components/food-image";
import { IngredientCart } from "@/components/detail/ingredient-cart";
import { ShareButton } from "@/components/detail/share-button";
import { StepTimer } from "@/components/detail/step-timer";
import { TrendChart } from "@/components/detail/trend-chart";
import { LikeButton } from "@/components/like-button";
import { ShoppingCartPanel } from "@/components/shopping-cart";
import { SiteFooter } from "@/components/site-footer";
import { getPublishedFood, getPublishedFoods } from "@/lib/catalog";

// 빌드할 때 게시된 음식의 상세 페이지만 만든다. 목록에 없는 주소는 404.html 로 간다.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPublishedFoods()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/food/[slug]">): Promise<Metadata> {
  const food = await getPublishedFood((await params).slug);
  return food ? { title: `${food.name} ${food.kind === "product" ? "제품 정보와 구매 안내" : "레시피와 재료"} | 트렌드푸드`, description: food.why } : {};
}

export default async function FoodPage({ params }: PageProps<"/food/[slug]">) {
  const food = await getPublishedFood((await params).slug);
  if (!food) notFound();

  const chips = [food.change, food.cookLabel, `난이도 ${food.difficulty}`, food.servings];

  return (
    <>
      <section aria-label="음식 소개" className="relative h-[440px] overflow-hidden bg-primary lg:h-[520px]">
        <FoodImage food={food} hero preload sizes="100vw" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,12,8,0.6)_0%,rgba(20,12,8,0)_30%,rgba(20,12,8,0)_38%,rgba(20,12,8,0.88)_100%)]"
        />
        <header className="relative">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-5 py-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full bg-scrim/45 py-2.5 pr-3.5 pl-2 text-[15px] font-bold text-white hover:text-white"
            >
              <ChevronLeft className="size-5" aria-hidden />
              {food.editorial ? "목록으로" : "순위로"}
            </Link>
            <Link href="/" className="text-[22px] font-black tracking-[-0.03em] text-white hover:text-white">
              트렌드푸드
            </Link>
            <div className="ml-auto flex gap-3">
              <LikeButton slug={food.slug} name={food.name} className="size-[46px]" />
              <ShoppingCartPanel compact />
              <ShareButton title={food.name} />
            </div>
          </div>
        </header>
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 pb-9 text-white">
            <nav aria-label="현재 위치" className="text-sm">
              <ol className="m-0 flex list-none gap-2 p-0">
                <li>
                  <Link href="/" className="text-white hover:text-white">
                    홈
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>{food.category}</li>
                <li aria-hidden>/</li>
                <li aria-current="page">{food.name}</li>
              </ol>
            </nav>
            <h1 className="text-[44px] leading-none font-black tracking-[-0.04em] lg:text-hero-detail">{food.name}</h1>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {chips.map((c, i) => (
                <li
                  key={c}
                  className={
                    i === 0
                      ? "rounded-full bg-white px-3 py-[7px] text-sm font-bold text-foreground"
                      : "rounded-full bg-scrim/55 px-3 py-[7px] text-sm"
                  }
                >
                  {c}
                </li>
              ))}
              {!food.editorial && <li className="rounded-full bg-scrim/55 px-3 py-[7px] text-sm">
                좋아요 {food.likes.toLocaleString("ko-KR")}
              </li>}
            </ul>
            {food.editorial && <p className="text-xs text-white">{food.imageAvailable ? "참고 사진 · 이 레시피를 직접 조리한 완성 사진은 아니에요." : "사진 준비 중 · 음식 소개와 출처를 먼저 확인하세요."}</p>}
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 pt-8 pb-28 lg:pb-16">
        {food.photoCredit && "credit" in food.photoCredit && <p className="text-[13px] wrap-anywhere text-muted-foreground">
          사진: {food.photoCredit.sourceUrl ? <a href={food.photoCredit.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-block min-h-11 max-w-full content-center align-middle text-accent underline">{food.photoCredit.credit}</a> : food.photoCredit.credit}
          {food.photoCredit.license !== "직접 촬영" && ` · ${food.photoCredit.license}`}
        </p>}

        <section className="flex flex-wrap gap-8">
          <div className={`flex min-w-0 flex-[1_1_460px] flex-col gap-2.5${food.videoId ? "" : " max-w-3xl"}`}>
            <h2 className="text-2xl font-black tracking-[-0.02em]">{food.editorial ? "어떤 음식인가요" : "왜 지금 뜨고 있나요"}</h2>
            <p className="text-base leading-[1.75] text-body md:text-[17px]">{food.summary}</p>
            {food.history ? <section aria-labelledby="history-title" className="mt-2 rounded-2xl border p-4">
              <h2 id="history-title" className="text-lg font-black">주목받은 시기 · {food.history.years.map((year) => `${year}년`).join(" · ")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-body">{food.history.note}</p>
              <ul className="mt-2 list-none space-y-1 p-0">
                {food.history.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">{source.title} ↗<span className="sr-only"> (새 창)</span></a></li>)}
              </ul>
            </section> : food.editorial && <p className="text-sm text-muted-foreground">일상 레시피 · 이 항목은 특정 연도 유행 음식으로 분류하지 않았어요.</p>}
            {!food.editorial && <TrendChart data={food.trend} multiplier={food.multiplier} />}
            <p className="text-[13px] text-muted-foreground">
              <span className="mr-1.5 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-bold text-foreground">AI 요약</span>
              {food.editorial ? food.editorial.recipeNote : "AI가 공개 검색량과 영상 제목을 바탕으로 요약했고, 운영자가 검수했어요."}
            </p>
          </div>
          {food.editorial ? (
            <section aria-labelledby="sources-title" className="flex min-w-0 flex-[1_1_460px] flex-col gap-3 rounded-2xl bg-muted p-5">
              <h2 id="sources-title" className="text-xl font-black">참고한 출처</h2>
              <p className="text-sm text-muted-foreground">확인 날짜 {food.editorial.checkedAt} · 실시간 인기 순위는 아직 집계하지 않았어요.</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {food.editorial.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">
                      {source.title} ↗<span className="sr-only"> (새 창)</span>
                    </a>
                  </li>
                ))}
              </ul>
              {food.photoCredit && "note" in food.photoCredit && <div className="border-t pt-3 text-sm leading-relaxed text-body">
                <p>{food.photoCredit.note}</p>
                <a href={food.photoCredit.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">사진 출처 · {food.photoCredit.author} · {food.photoCredit.license} ↗<span className="sr-only"> (새 창)</span></a>
              </div>}
            </section>
          ) : null}
          {food.videoId && <figure className="m-0 flex min-w-0 flex-[1_1_460px] flex-col gap-2">
            <div className="relative aspect-video min-h-[200px] overflow-hidden rounded-2xl bg-primary">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${food.videoId}`}
                title={`${food.name} 원본 영상`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 size-full border-0"
              />
            </div>
            <figcaption className="text-[13px] leading-relaxed text-muted-foreground">
              원본 영상은 YouTube 공식 플레이어로 재생돼요. 원작자가 요청하면 바로 내려요.{" "}
              <a href={`https://www.youtube.com/watch?v=${food.videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-accent underline">YouTube에서 보기</a>
            </figcaption>
          </figure>}
        </section>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <IngredientCart food={food} />

          <div className="flex min-w-0 flex-col gap-9">
            {food.convenience.length > 0 && <section className="flex flex-col gap-3">
              <h2 className="text-2xl font-black tracking-[-0.02em]">편의점·마트에서 사서 맛보기</h2>
              <p className="text-base text-body">직접 만들기 전에 맛부터 보고 싶다면 이런 곳을 찾아보세요.</p>
              <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                {food.convenience.map((c) => (
                  <li key={c.place} className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
                    <b className="text-base">{c.place}</b>
                    <span className="text-sm leading-relaxed text-body">{c.desc}</span>
                  </li>
                ))}
              </ul>
            </section>}

            <section>
              <div className="flex items-baseline justify-between gap-2.5 pb-2">
              <h2 className="text-2xl font-black tracking-[-0.02em]">{food.kind === "product" ? "고르고 즐기는 법" : "만드는 법"}</h2>
                <p className="text-sm text-muted-foreground">{food.steps.length}단계</p>
              </div>
              <ol className="m-0 list-none p-0">
                {food.steps.map((s, i) => (
                  <li key={s.text} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 border-t py-[18px]">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary text-lg font-black text-white">
                      <span className="sr-only">단계 </span>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-base leading-[1.7] md:text-[17px]">{s.text}</p>
                      {s.timerMinutes && <StepTimer minutes={s.timerMinutes} />}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-2 rounded-2xl bg-muted px-[18px] py-4 text-[15px] leading-[1.7]">
                <b>팁</b> {food.tip}
              </p>
            </section>

            <AdSlot label="조리법 하단" className="h-[140px]" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
