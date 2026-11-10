import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cleanSteps, ingredientChanges, moveItem, photoChanges, type IngredientDraft, type SavedIngredient, type StepDraft } from "@/data/admin-food-edit.ts";
import type { Step } from "@/data/catalog-schema";
import { photos } from "@/lib/foods";

export type FoodDetails = { slug: string; name: string; image: string; alt: string; steps: Step[] };
type Props = { row: FoodDetails; db: SupabaseClient; onNotice: (message: string) => void; onReload: () => Promise<void> };

export function FoodDetailsEditor(props: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-t pt-3">
      <PhotoEditor {...props} />
      <IngredientsEditor {...props} />
      <StepsEditor {...props} />
    </div>
  );
}

function PhotoEditor({ row, db, onNotice, onReload }: Props) {
  const [image, setImage] = useState(row.image);
  const [alt, setAlt] = useState(row.alt);
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = photoChanges(row.image, image, alt);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      const { error } = await db.from("foods").update(result.value).eq("slug", row.slug);
      if (error) throw error;
      onNotice(`${row.name} 사진을 저장했어요. '사이트에 반영'을 눌러 주세요.`);
      await onReload();
    } catch (error) {
      onNotice(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 text-lg font-bold">사진</legend>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`${row.slug}-photo`}>사진 고르기</Label>
            <select id={`${row.slug}-photo`} value={image} onChange={(e) => setImage(e.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-base">
              {Object.keys(photos).map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </div>
          {photos[image] && <Image src={photos[image]} alt={alt} width={64} height={64} className="size-16 rounded-lg object-cover" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${row.slug}-alt`}>사진 설명 (화면을 못 보는 사람에게 읽어 주는 글, 120자)</Label>
          <Input id={`${row.slug}-alt`} required maxLength={120} value={alt} onChange={(e) => setAlt(e.target.value)} className="h-11 text-base" />
        </div>
        <p className="text-sm text-muted-foreground">지금 들어 있는 사진은 모두 데모예요. 실제 서비스 전에 바꿔야 해요.</p>
        <Button type="submit" className="self-start">사진 저장</Button>
      </fieldset>
    </form>
  );
}

function IngredientsEditor({ row, db, onNotice }: Props) {
  const [original, setOriginal] = useState<SavedIngredient[] | null>(null);
  const [items, setItems] = useState<(IngredientDraft & { key: string })[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await db.from("ingredients").select("id, name, hard, pantry, position, url").eq("food_slug", row.slug).order("position");
    if (error) {
      setOriginal(null);
      onNotice(`재료를 못 불러왔어요: ${error.message}`);
      return;
    }
    const list = data as SavedIngredient[];
    setOriginal(list);
    setItems(list.map((item) => ({ ...item, key: String(item.id) })));
    setConfirming(null);
  }, [db, row.slug, onNotice]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save() {
    if (!original) return;
    const result = ingredientChanges(original, items);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      // 기존 행은 유지한다. 가격·링크는 PATCH 에 포함하지 않는다.
      for (const id of result.value.removed) {
        const { error } = await db.from("ingredients").delete().eq("id", id).eq("food_slug", row.slug);
        if (error) throw error;
      }
      for (const { id, patch } of result.value.updated) {
        const { error } = await db.from("ingredients").update(patch).eq("id", id).eq("food_slug", row.slug);
        if (error) throw error;
      }
      for (const item of result.value.added) {
        const { error } = await db.from("ingredients").insert({ ...item, food_slug: row.slug });
        if (error) throw error;
      }
      onNotice(`${row.name} 재료를 저장했어요. '사이트에 반영'을 눌러 주세요.`);
    } catch (error) {
      // 여러 요청 중 하나라도 실패하면 성공으로 표시하지 않고 DB 상태를 다시 읽는다.
      onNotice(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      await load();
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-lg font-bold">재료</legend>
        {!original ? <p className="text-base text-muted-foreground">불러오는 중이에요…</p> : <>
        {items.map((item, index) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
            <Label htmlFor={`${row.slug}-ingredient-${item.key}`}>재료 이름</Label>
            <Input id={`${row.slug}-ingredient-${item.key}`} required maxLength={60} className="h-11 text-base" value={item.name} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, name: e.target.value } : old))} />
            <div className="flex flex-wrap gap-3">
              {([['hard', '구하기 어려워요'], ['pantry', '집에 흔히 있어요']] as const).map(([key, label]) => (
                <Label key={key} htmlFor={`${row.slug}-${item.key}-${key}`} className="flex min-h-11 items-center gap-2">
                  <input id={`${row.slug}-${item.key}-${key}`} type="checkbox" className="size-5 accent-primary" checked={item[key]} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, [key]: e.target.checked } : old))} />
                  {label}
                </Label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <OrderButtons name={item.name || `재료 ${index + 1}`} index={index} count={items.length} onMove={(direction) => setItems(moveItem(items, index, direction))} />
              <Button type="button" variant="outline" aria-label={confirming === item.key ? "링크도 지워져요. 정말 삭제" : `${item.name || `재료 ${index + 1}`} 삭제`} onClick={() => {
                if (item.url && confirming !== item.key) return setConfirming(item.key);
                setItems(items.filter((old) => old.key !== item.key));
                setConfirming(null);
              }}>{confirming === item.key ? "링크도 지워져요. 정말 삭제" : "삭제"}</Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={items.length >= 30} onClick={() => setItems([...items, { key: crypto.randomUUID(), name: "", hard: false, pantry: false }])}>재료 추가</Button>
          <Button type="submit">재료 저장</Button>
        </div>
        </>}
      </fieldset>
    </form>
  );
}

function StepsEditor({ row, db, onNotice, onReload }: Props) {
  const [items, setItems] = useState<(StepDraft & { key: string })[]>(() => row.steps.map((step, index) => ({ key: String(index), text: step.text, timer: step.timerMinutes?.toString() ?? "" })));
  const [saving, setSaving] = useState(false);
  async function save() {
    const result = cleanSteps(items);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      const { error } = await db.from("foods").update({ steps: result.value }).eq("slug", row.slug);
      if (error) throw error;
      onNotice(`${row.name} 조리법을 저장했어요. '사이트에 반영'을 눌러 주세요.`);
      await onReload();
    } catch (error) {
      onNotice(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-lg font-bold">조리법</legend>
        {items.map((item, index) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
            <Label htmlFor={`${row.slug}-step-${item.key}`}>{index + 1}단계 내용</Label>
            <Textarea id={`${row.slug}-step-${item.key}`} required maxLength={300} rows={3} value={item.text} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, text: e.target.value } : old))} />
            <Label htmlFor={`${row.slug}-timer-${item.key}`}>타이머(분, 없으면 비워 두기)</Label>
            <Input id={`${row.slug}-timer-${item.key}`} inputMode="numeric" className="h-11 text-base" value={item.timer} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, timer: e.target.value } : old))} />
            <div className="flex flex-wrap gap-2">
              <OrderButtons name={`${index + 1}단계`} index={index} count={items.length} onMove={(direction) => setItems(moveItem(items, index, direction))} />
              <Button type="button" variant="outline" aria-label={`${index + 1}단계 삭제`} onClick={() => setItems(items.filter((old) => old.key !== item.key))}>삭제</Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={items.length >= 20} onClick={() => setItems([...items, { key: crypto.randomUUID(), text: "", timer: "" }])}>단계 추가</Button>
          <Button type="submit">조리법 저장</Button>
        </div>
      </fieldset>
    </form>
  );
}

function OrderButtons({ name, index, count, onMove }: { name: string; index: number; count: number; onMove: (direction: -1 | 1) => void }) {
  return <>
    <Button type="button" variant="outline" size="icon" aria-label={`${name} 위로`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden /></Button>
    <Button type="button" variant="outline" size="icon" aria-label={`${name} 아래로`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden /></Button>
  </>;
}
