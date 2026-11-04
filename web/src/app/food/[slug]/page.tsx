import { ChevronLeft, Play } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdSlot } from "@/components/ad-slot";
import { IngredientCart } from "@/components/detail/ingredient-cart";
import { ShareButton } from "@/components/detail/share-button";
import { StepTimer } from "@/components/detail/step-timer";
import { TrendChart } from "@/components/detail/trend-chart";
import { LikeButton } from "@/components/like-button";
import { SiteFooter } from "@/components/site-footer";
import { getPublishedFood } from "@/lib/catalog";
import { foods } from "@/lib/foods";

export function generateStaticParams() {
  return foods.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/food/[slug]">): Promise<Metadata> {
  const food = await getPublishedFood((await params).slug);
  return food ? { title: `${food.name} 레시피와 재료 | 트렌드푸드`, description: food.why } : {};
}

// params 는 <Suspense> 안에서 읽어야 즉시 이동(instant shell)이 된다 (Next 16 Cache Components)
export default function FoodPage({ params }: PageProps<"/food/[slug]">) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <FoodDetail params={params} />
    </Suspense>
  );
}

function DetailFallback() {
  return (
    <div aria-busy className="flex flex-1 flex-col">
      <div className="h-[440px] bg-primary lg:h-[520px]" />
      <p className="mx-auto w-full max-w-[1200px] px-5 py-8 text-base text-muted-foreground">불러오는 중이에요…</p>
    </div>
  );
}

async function FoodDetail({ params }: Pick<PageProps<"/food/[slug]">, "params">) {
  const food = await getPublishedFood((await params).slug);
  if (!food) notFound();

  const chips = [food.change, food.cookLabel, `난이도 ${food.difficulty}`, food.servings];

  return (
    <>
      <section aria-label="음식 소개" className="relative h-[440px] overflow-hidden bg-primary lg:h-[520px]">
        <Image
          src={food.heroImage ?? food.image}
          alt={food.heroAlt ?? food.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover"
          placeholder="blur"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,12,8,0.6)_0%,rgba(20,12,8,0)_30%,rgba(20,12,8,0)_38%,rgba(20,12,8,0.88)_100%)]"
        />
        <header className="relative">
          <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-5 py-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full bg-scrim/45 py-2.5 pr-3.5 pl-2 text-[15px] font-bold text-white hover:text-white"
            >
              <ChevronLeft className="size-5" aria-hidden />
              순위로
            </Link>
            <Link href="/" className="text-[22px] font-black tracking-[-0.03em] text-white hover:text-white">
              트렌드푸드
            </Link>
            <div className="ml-auto flex gap-2">
              <LikeButton slug={food.slug} name={food.name} className="size-[46px]" />
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
              <li className="rounded-full bg-scrim/55 px-3 py-[7px] text-sm">
                좋아요 {food.likes.toLocaleString("ko-KR")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 pt-8 pb-28 lg:pb-16">
        <section className="flex flex-wrap gap-8">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-2.5">
            <h2 className="text-2xl font-black tracking-[-0.02em]">왜 지금 뜨고 있나요</h2>
            <p className="text-base leading-[1.75] text-body md:text-[17px]">{food.summary}</p>
            <TrendChart data={food.trend} multiplier={food.multiplier} />
            <p className="text-[13px] text-muted-foreground">
              <span className="mr-1.5 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-bold text-foreground">AI 요약</span>
              AI가 공개 검색량과 영상 제목을 바탕으로 요약했고, 운영자가 검수했어요.
            </p>
          </div>
          <figure className="m-0 flex min-w-0 flex-[1_1_460px] flex-col gap-2">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-primary">
              <Image src={food.image} alt="" fill sizes="(max-width: 1024px) 100vw, 560px" className="object-cover opacity-80" />
              <span className="absolute top-1/2 left-1/2 flex h-12 w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-[#E62117]">
                <Play className="size-5 fill-white text-white" aria-hidden />
              </span>
            </div>
            <figcaption className="text-[13px] leading-relaxed text-muted-foreground">
              원본 영상 자리: 운영자가 등록하면 YouTube 공식 임베드로 재생돼요 (관련 영상 {food.videos}개). 원작자가
              요청하면 바로 내려요.
            </figcaption>
          </figure>
        </section>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <IngredientCart food={food} />

          <div className="flex min-w-0 flex-col gap-9">
            <section className="flex flex-col gap-3">
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
            </section>

            <section>
              <div className="flex items-baseline justify-between gap-2.5 pb-2">
                <h2 className="text-2xl font-black tracking-[-0.02em]">만드는 법</h2>
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
