import { ArrowDown, ChevronDown, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FoodImage } from "@/components/food-image";
import { FoodVideo } from "@/components/food-video";
import { RecipeWorkspace } from "@/components/detail/recipe-workspace";
import { ShareButton } from "@/components/detail/share-button";
import { TrendChart } from "@/components/detail/trend-chart";
import { LikeButton } from "@/components/like-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteLogo } from "@/components/site-logo";
import { SITE_NAME } from "@/data/site";
import { getPublishedFood, getPublishedFoods } from "@/lib/catalog";
import { foodUrl, recipeJson, safeJson } from "@/data/seo";
import { foodVideoId } from "@/data/youtube";

function DetailSourceLinks({ sources, className }: {
  sources: { title: string; url: string }[];
  className?: string;
}) {
  const renderLinks = (links: typeof sources) => (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {links.map((source) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold wrap-anywhere underline underline-offset-4">
            {source.title} ↗<span className="sr-only"> (새 창)</span>
          </a>
        </li>
      ))}
    </ul>
  );
  const more = sources.slice(2);

  return (
    <div className={className}>
      {renderLinks(sources.slice(0, 2))}
      {more.length > 0 && (
        <details className="group mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm px-1 text-sm font-bold text-accent hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">더보기</span>
            <span className="hidden group-open:inline">접기</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          {renderLinks(more)}
        </details>
      )}
    </div>
  );
}

// 빌드할 때 게시된 음식의 상세 페이지만 만든다. 목록에 없는 주소는 404.html 로 간다.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPublishedFoods()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/food/[slug]">): Promise<Metadata> {
  const food = await getPublishedFood((await params).slug);
  return food ? { title: `${food.name} ${food.kind === "discovery" ? "음식 정보와 출처" : food.kind === "product" ? "제품 정보와 구매 안내" : "레시피와 재료"} | ${SITE_NAME}`, description: food.why, alternates: { canonical: foodUrl(food.slug) }, openGraph: { title: food.name, siteName: SITE_NAME, description: food.why, url: foodUrl(food.slug), type: "article", locale: "ko_KR", ...(food.imageAvailable ? { images: [{ url: (food.heroImage ?? food.image).src, alt: food.heroAlt ?? food.alt }] } : {}) } } : {};
}

export default async function FoodPage({ params }: PageProps<"/food/[slug]">) {
  const food = await getPublishedFood((await params).slug);
  if (!food) notFound();

  const discovery = food.kind === "discovery";
  const sourceVideo = food.videoId ? null : foodVideoId(food);
  const structured = recipeJson(food, food.imageAvailable ? (food.heroImage ?? food.image).src : undefined);
  const chips = [...new Set([food.change, food.cookLabel, ...(!discovery ? [`난이도 ${food.difficulty}`, food.servings] : [])])];

  return (
    <>
      {structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(structured) }} />}
      <header className="border-b bg-background">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 px-5 py-4">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-1.5 text-foreground hover:text-accent"
            >
              <ChevronLeft className="size-5" aria-hidden />
              <SiteLogo />
            </Link>
            <div className="ml-auto flex gap-1 rounded-full border px-1">
              <LikeButton slug={food.slug} name={food.name} className="size-[46px] bg-background" />
              <ShareButton title={food.name} url={foodUrl(food.slug)} />
            </div>
          </div>
      </header>
      <section aria-label="음식 소개" className={`mx-auto grid max-w-[1200px] gap-6 px-5 pt-6 pb-8 md:gap-10 md:pt-9 md:pb-11${food.imageAvailable ? " md:grid-cols-2 md:items-center" : ""}`}>
          {food.imageAvailable && <div className="motion-feature relative aspect-[4/3] overflow-hidden rounded-feature bg-secondary md:aspect-square">
            <FoodImage food={food} hero preload sizes="(max-width: 767px) 100vw, 580px" />
          </div>}
          <div className="motion-copy flex min-w-0 flex-col items-start gap-5">
            <nav aria-label="현재 위치" className="text-[13px] text-muted-foreground">
              <ol className="m-0 flex list-none gap-2 p-0">
                <li>
                  <Link href="/" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-accent">
                    홈
                  </Link>
                </li>
                <li aria-hidden className="content-center">/</li>
                <li className="content-center">{food.category}</li>
                <li aria-hidden className="content-center">/</li>
                <li aria-current="page" className="content-center">{food.name}</li>
              </ol>
            </nav>
            <h1 className="text-feature-mobile leading-[1.08] font-black tracking-[-0.05em] lg:text-feature">{food.name}</h1>
            <p className="max-w-[30em] text-base leading-relaxed text-body md:text-lg">{food.why}</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {chips.map((c, i) => (
                <li
                  key={c}
                  className={
                    i === 0
                      ? "rounded-full bg-key-bg px-3 py-2 text-sm font-bold text-key"
                      : "rounded-full bg-muted px-3 py-2 text-sm text-muted-foreground"
                  }
                >
                  {c}
                </li>
              ))}
              {!food.editorial && <li className="rounded-full bg-muted px-3 py-2 text-sm text-muted-foreground">
                좋아요 {food.likes.toLocaleString("ko-KR")}
              </li>}
            </ul>
            <div className="flex flex-wrap gap-3">
              <a href={discovery ? "#sources" : "#recipe"} className="motion-press inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:text-primary-foreground">{discovery ? "소개 출처 보기" : food.kind === "product" ? "고르고 즐기는 법" : "만드는 법"}<ArrowDown className="size-4" aria-hidden /></a>
              {!discovery && <a href="#cart" className="motion-press inline-flex min-h-12 items-center rounded-full border border-line-strong px-5 text-sm font-bold text-foreground hover:text-accent">{food.kind === "product" ? "제품 보기" : "재료 살펴보기"}</a>}
              {sourceVideo && <FoodVideo name={food.name} videoId={sourceVideo} />}
            </div>
          </div>
      </section>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 pt-8 pb-28 lg:pb-16">
        {!discovery && <RecipeWorkspace food={food} />}

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
              <DetailSourceLinks sources={food.history.sources} className="mt-2" />
            </section> : food.editorial && <p className="text-sm text-muted-foreground">{discovery ? "유행 시기 미확정" : "일상 레시피"} · 이 항목은 특정 연도 유행 음식으로 분류하지 않았어요.</p>}
            {!food.editorial && <TrendChart data={food.trend} multiplier={food.multiplier} />}
            <p className="text-[13px] text-muted-foreground">
              <span className="mr-1.5 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-bold text-foreground">AI 요약</span>
              {food.editorial ? food.editorial.recipeNote : "AI가 공개 검색량과 영상 제목을 바탕으로 요약했고, 운영자가 검수했어요."}
            </p>
          </div>
          {food.editorial ? (
            <section id="sources" aria-labelledby="sources-title" className="flex min-w-0 flex-[1_1_460px] flex-col gap-3 rounded-2xl bg-muted p-5">
              <h2 id="sources-title" className="text-xl font-black">참고한 출처</h2>
              <p className="text-sm text-muted-foreground">확인 날짜 {food.editorial.checkedAt} · 실시간 인기 순위는 아직 집계하지 않았어요.</p>
              <DetailSourceLinks sources={food.editorial.sources} />
              {food.imageAvailable && <details aria-label="사진 정보" className="group border-t text-sm text-muted-foreground">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  사진 정보 <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="leading-relaxed">{food.generatedImage ? "AI 생성 예시 · 실제 조리·제품 사진이 아니에요." : food.photoCredit?.license === "직접 촬영" ? "직접 촬영한 사진이에요." : discovery ? "참고 사진 · 소개된 판매 제품과 다를 수 있어요." : "참고 사진 · 이 레시피를 직접 조리한 완성 사진은 아니에요."}</p>
              {food.generatedImage && <div className="pt-3 text-sm leading-relaxed text-body" aria-label="이미지 안내">
                <p className="font-bold">AI 생성 예시 이미지</p>
                <p>{food.generatedImage.note}</p>
                <p>제작: {food.generatedImage.tool} · {food.generatedImage.generatedAt}</p>
                {food.generatedImage.reference && <>
                  <a href={food.generatedImage.reference.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">생성 참고 원본 · {food.generatedImage.reference.author} ↗<span className="sr-only"> (새 창)</span></a>
                  <p>{food.generatedImage.reference.attributionNotice}</p>
                  <a href={food.generatedImage.reference.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">참고 사진·변환본 이용 조건 · {food.generatedImage.reference.license} ↗<span className="sr-only"> (새 창)</span></a>
                </>}
              </div>}
              {food.photoCredit && "note" in food.photoCredit && <div className="pt-3 text-sm leading-relaxed text-body">
                <p>{food.photoCredit.note}</p>
                <p className="wrap-anywhere">{food.photoCredit.title}</p>
                {food.photoCredit.attributionNotice && <p className="wrap-anywhere">{food.photoCredit.attributionNotice}</p>}
                <a href={food.photoCredit.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">사진 출처 · {food.photoCredit.author} · {food.photoCredit.license} ↗<span className="sr-only"> (새 창)</span></a>
                {food.photoCredit.creatorUrl && <p><a href={food.photoCredit.creatorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">사진 작가 · {food.photoCredit.author} ↗<span className="sr-only"> (새 창)</span></a></p>}
                {food.photoCredit.licenseUrl && <p><a href={food.photoCredit.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">사진 라이선스 · {food.photoCredit.license} ↗<span className="sr-only"> (새 창)</span></a></p>}
              </div>}
              </details>}
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

      </main>
      <SiteFooter />
    </>
  );
}
