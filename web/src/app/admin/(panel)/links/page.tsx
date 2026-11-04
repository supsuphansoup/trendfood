import Link from "next/link";
import { Suspense } from "react";
import { LinksForm } from "@/components/admin/links-form";
import { getCatalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export default function AdminLinksPage({ searchParams }: PageProps<"/admin/links">) {
  return (
    <section aria-labelledby="links-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 id="links-title" className="text-2xl font-black tracking-[-0.02em]">
          재료 링크
        </h1>
        <p className="text-sm text-body">
          쿠팡 파트너스에서 만든 상품 링크와 참고 가격을 넣으세요. 비워 두면 사용자에게 쿠팡 검색 결과가 열려요 (수수료 없음).
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <LinksEditor searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function LinksEditor({ searchParams }: Pick<PageProps<"/admin/links">, "searchParams">) {
  const { food } = await searchParams;
  const catalog = await getCatalog();
  const current = catalog.find((f) => f.slug === food) ?? catalog[0];
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
      <nav aria-label="음식 고르기" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {catalog.map((f) => {
          const done = f.ingredients.filter((i) => i.url).length;
          return (
            <Link
              key={f.slug}
              href={`/admin/links?food=${f.slug}`}
              aria-current={f.slug === current.slug ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl bg-background px-3 text-sm text-foreground",
                f.slug === current.slug && "bg-primary font-bold text-white hover:text-white",
              )}
            >
              <span>{f.name}</span>
              <span className="tabular-nums opacity-80">
                {done}/{f.ingredients.length}
              </span>
            </Link>
          );
        })}
      </nav>
      <LinksForm
        key={current.slug}
        slug={current.slug}
        name={current.name}
        ingredients={current.ingredients.map((i) => ({ name: i.name, url: i.url ?? "", price: i.price, pantry: !!i.pantry }))}
      />
    </div>
  );
}
