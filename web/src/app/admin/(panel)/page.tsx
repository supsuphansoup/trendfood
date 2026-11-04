import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { moveFood, setHidden } from "@/app/admin/actions";
import { TextForm } from "@/components/admin/text-form";
import { getCatalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export default function AdminFoodsPage() {
  return (
    <section aria-labelledby="foods-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 id="foods-title" className="text-2xl font-black tracking-[-0.02em]">
          게시 관리
        </h1>
        <p className="text-sm text-body">
          순서를 바꾸면 공개 순위가 바로 바뀌어요. 숨긴 음식은 메인·상세에서 빠지고, 나머지가 1위부터 다시 매겨져요.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <FoodsTable />
      </Suspense>
    </section>
  );
}

const iconBtn =
  "flex size-11 items-center justify-center rounded-lg border-[1.5px] border-line-strong bg-white disabled:opacity-30";

async function FoodsTable() {
  await connection();
  const catalog = await getCatalog();
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {catalog.map((f, i) => (
        <li key={f.slug} className={cn("rounded-2xl border bg-background p-4", f.hidden && "border-dashed bg-muted/50")}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <form action={moveFood.bind(null, f.slug, -1)}>
                <button type="submit" disabled={i === 0} aria-label={`${f.name} 위로`} className={iconBtn}>
                  <ChevronUp className="size-5" aria-hidden />
                </button>
              </form>
              <form action={moveFood.bind(null, f.slug, 1)}>
                <button type="submit" disabled={i === catalog.length - 1} aria-label={`${f.name} 아래로`} className={iconBtn}>
                  <ChevronDown className="size-5" aria-hidden />
                </button>
              </form>
            </div>
            <span className="w-14 text-center text-3xl font-black text-accent tabular-nums">
              {f.hidden ? <span className="text-base text-muted-foreground">숨김</span> : f.rank}
            </span>
            <Image src={f.image} alt="" width={96} height={64} className="h-16 w-24 rounded-lg object-cover" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={`/food/${f.slug}`} target="_blank" className="text-lg font-bold text-foreground">
                {f.name}
              </Link>
              <span className="text-sm text-muted-foreground">
                {f.category} · 재료 {f.ingredients.length}개 · 링크 등록 {f.ingredients.filter((x) => x.url).length}개
              </span>
            </div>
            <form action={setHidden.bind(null, f.slug, !f.hidden)}>
              <button
                type="submit"
                className={cn(
                  "flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-bold",
                  f.hidden ? "bg-primary text-white" : "border-[1.5px] border-line-strong bg-white",
                )}
              >
                {f.hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                {f.hidden ? "다시 공개" : "숨기기"}
              </button>
            </form>
            <Link
              href={`/admin/links?food=${f.slug}`}
              className="flex min-h-11 items-center rounded-lg border-[1.5px] border-line-strong bg-white px-4 text-sm font-bold text-foreground"
            >
              재료 링크
            </Link>
          </div>
          <details className="mt-3 group">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-bold">글 고치기</summary>
            <TextForm slug={f.slug} name={f.name} why={f.why} summary={f.summary} />
          </details>
        </li>
      ))}
    </ol>
  );
}
