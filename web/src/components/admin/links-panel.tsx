import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUPANG_URL_RE } from "@/data/candidates";

type FoodOption = { slug: string; name: string };
type Ing = { id: number; name: string; price: number | null; url: string | null };

/** 재료 링크: 쿠팡 주소(파트너스 링크)와 참고 가격을 재료마다 등록 */
export function LinksPanel({ db }: { db: SupabaseClient }) {
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [slug, setSlug] = useState("");
  const [items, setItems] = useState<Ing[] | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    db.from("foods")
      .select("slug, name")
      .order("sort_order")
      .then(({ data }) => {
        const list = (data ?? []) as FoodOption[];
        setFoods(list);
        setSlug((s) => s || list[0]?.slug || "");
      });
  }, [db]);

  const load = useCallback(async () => {
    if (!slug) return;
    const { data, error } = await db
      .from("ingredients")
      .select("id, name, price, url")
      .eq("food_slug", slug)
      .order("position");
    if (error) return setNotice(`재료를 못 불러왔어요: ${error.message}`);
    setItems(data as Ing[]);
  }, [db, slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(ing: Ing, form: FormData) {
    const url = String(form.get("url") ?? "").trim();
    const priceText = String(form.get("price") ?? "").replaceAll(",", "").trim();
    if (url && !COUPANG_URL_RE.test(url)) return setNotice("쿠팡 주소(https://…coupang.com 또는 coupa.ng)만 넣을 수 있어요.");
    const price = priceText ? Number(priceText) : null;
    if (price !== null && (!Number.isInteger(price) || price < 0)) return setNotice("가격은 0 이상의 숫자로 넣어 주세요.");
    const { error } = await db.from("ingredients").update({ url: url || null, price }).eq("id", ing.id);
    setNotice(error ? `저장하지 못했어요: ${error.message}` : `${ing.name} 링크를 저장했어요.`);
    await load();
  }

  return (
    <section aria-labelledby="links-title" className="flex flex-col gap-3">
      <h2 id="links-title" className="text-2xl font-black tracking-[-0.02em]">
        재료 링크
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        쿠팡 파트너스 링크와 참고 가격을 넣어요. 비워 두면 사이트에서는 쿠팡 검색 링크로 대신 연결돼요. 가격은 쿠팡
        API 승인 전까지 운영자가 직접 확인한 참고값이에요.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="links-food">음식</Label>
        <select
          id="links-food"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="h-11 max-w-sm rounded-lg border border-line-strong bg-background px-3 text-base"
        >
          {foods.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <p role="status" className="text-sm font-bold empty:hidden">
        {notice}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items?.map((ing) => (
          <li key={ing.id} className="rounded-2xl border bg-background p-4">
            <form
              className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_140px_auto] md:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                void save(ing, new FormData(e.currentTarget));
              }}
            >
              <h3 className="text-base font-bold md:pb-2.5">{ing.name}</h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`url-${ing.id}`}>쿠팡 주소</Label>
                <Input className="h-11 text-base" id={`url-${ing.id}`} name="url" type="url" inputMode="url" defaultValue={ing.url ?? ""} placeholder="https://link.coupang.com/…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`price-${ing.id}`}>참고 가격(원)</Label>
                <Input className="h-11 text-base" id={`price-${ing.id}`} name="price" inputMode="numeric" defaultValue={ing.price ?? ""} />
              </div>
              <Button type="submit" aria-label={`${ing.name} 저장`}>
                저장
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
