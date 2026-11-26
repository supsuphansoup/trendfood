import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cleanConvenience, cleanSteps, convenienceDrafts, ingredientChanges, moveItem, photoChanges, youtubeId, type ConvenienceDraft, type IngredientDraft, type SavedIngredient, type StepDraft } from "@/data/admin-food-edit.ts";
import type { FoodRecord, Ingredient, Step } from "@/data/catalog-schema";
import { contentImages } from "@/data/content";
import type { ContentEdit } from "@/data/content-edits";
import { generatedImages } from "@/data/generated-images";
import { photoLabel, type Photo } from "@/data/photos.ts";
import { photos } from "@/lib/foods";
import { PhotoUploader } from "./photo-uploader";

export type FoodDetails = { slug: string; name: string; image: string; alt: string; steps: Step[]; convenience: unknown; video_id?: string | null; kind?: FoodRecord["kind"]; ingredients?: Ingredient[] };
type Props = {
  row: FoodDetails;
  db: SupabaseClient;
  onNotice: (message: string) => void;
  onReload: () => Promise<void>;
  saveContent?: (patch: ContentEdit) => Promise<void>;
};

async function saveDetails({ db, row, saveContent, onReload }: Props, patch: ContentEdit, legacy: Record<string, unknown> = patch) {
  if (saveContent) return saveContent(patch);
  const { error } = await db.from("foods").update(legacy).eq("slug", row.slug);
  if (error) throw error;
  await onReload();
}

export function FoodDetailsEditor(props: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-t pt-3">
      <PhotoEditor {...props} />
      <VideoEditor {...props} />
      {(!props.saveContent || props.row.kind !== "discovery") && <>
        <IngredientsEditor {...props} />
        <StepsEditor {...props} />
      </>}
      <ConvenienceEditor {...props} />
    </div>
  );
}

function PhotoEditor(props: Props) {
  const { row, db, onNotice, saveContent } = props;
  const [image, setImage] = useState(row.image);
  const [alt, setAlt] = useState(row.alt);
  const [saving, setSaving] = useState(false);
  const [uploaded, setUploaded] = useState<Photo[] | null>(null);
  const [photosAvailable, setPhotosAvailable] = useState(false);

  const loadPhotos = useCallback(async () => {
    const { data, error } = await db.from("photos").select("id, path, width, height, credit, source_url, license, created_at").order("created_at", { ascending: false }).limit(100);
    setUploaded(error ? [] : data as Photo[]);
    setPhotosAvailable(!error);
  }, [db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPhotos();
  }, [loadPhotos]);

  const selected = uploaded?.find((photo) => photo.id === image);
  const choices = saveContent
    ? contentImages.filter((key) => !generatedImages[key] || generatedImages[key].slug === row.slug)
    : Object.keys(photos);

  async function save() {
    const result = photoChanges(row.image, image, alt);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      await saveDetails(props, {
        ...(image === row.image ? {} : { image }),
        ...(result.value.alt === row.alt && image === row.image ? {} : { alt: result.value.alt }),
      }, result.value);
      onNotice(`${row.name} 사진을 저장했어요. '사이트에 반영'을 눌러 주세요.`);
    } catch (error) {
      onNotice(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 text-lg font-bold">사진</legend>
        {uploaded === null ? <p className="text-base text-muted-foreground">불러오는 중이에요…</p> : <>
        <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 max-w-full flex-col gap-1.5">
            <Label htmlFor={`${row.slug}-photo`}>사진 고르기</Label>
            <select id={`${row.slug}-photo`} value={image} onChange={(e) => setImage(e.target.value)} className="h-11 min-w-0 max-w-full rounded-lg border border-input bg-background px-3 text-base">
              {choices.map((key) => <option key={key} value={key}>{key === "pending" ? "사진 없음" : key}</option>)}
              {uploaded.map((photo) => <option key={photo.id} value={photo.id}>{photoLabel(photo)}</option>)}
            </select>
          </div>
          {photos[image] && <Image src={photos[image]} alt={alt} width={64} height={64} className="size-16 rounded-lg object-cover" />}
          {/* 저장소 미리보기는 공개 주소를 그대로 사용한다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {selected && <img src={db.storage.from("food-photos").getPublicUrl(selected.path).data.publicUrl} alt={alt} width={64} height={64} className="size-16 rounded-lg object-cover" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${row.slug}-alt`}>사진 설명 (화면을 못 보는 사람에게 읽어 주는 글, 120자)</Label>
          <Input id={`${row.slug}-alt`} required maxLength={120} value={alt} onChange={(e) => setAlt(e.target.value)} className="h-11 text-base" />
        </div>
        {selected && <p className="text-sm text-muted-foreground">{"올린 사진은 [사진 저장] 뒤 '사이트에 반영'을 눌러야 방문자에게 보여요."}</p>}
        {!saveContent && <p className="text-sm text-muted-foreground">지금 들어 있는 사진은 모두 데모예요. 실제 서비스 전에 바꿔야 해요.</p>}
        <Button type="submit" className="self-start">사진 저장</Button>
        </fieldset>
        </form>
        {photosAvailable ? <PhotoUploader slug={row.slug} db={db} onNotice={onNotice} onUploaded={async (id) => { await loadPhotos(); setImage(id); }} /> : <p className="text-sm text-muted-foreground">사진 올리기를 쓰려면 Supabase SQL Editor 에서 web/supabase/migrations/0004_photos.sql 을 먼저 실행해 주세요.</p>}
        </>}
      </fieldset>
  );
}

function VideoEditor(props: Props) {
  const { row, onNotice } = props;
  const [input, setInput] = useState(row.video_id ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = youtubeId(input);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      await saveDetails(props, result.value === row.video_id ? {} : { videoId: result.value }, { video_id: result.value });
      setInput(result.value ?? "");
      onNotice(`${row.name} 영상을 ${result.value ? "저장했어요" : "내렸어요"}. '사이트에 반영'을 눌러 주세요.`);
    } catch (error) {
      onNotice(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-lg font-bold">원본 영상</legend>
        {row.video_id === undefined ? <p className="text-sm text-muted-foreground">DB 에 영상 칸이 아직 없어요. Supabase SQL Editor 에서 web/supabase/migrations/0002_video.sql 을 먼저 실행해 주세요.</p> : <>
          <Label htmlFor={`${row.slug}-video`}>YouTube 주소 또는 영상 ID</Label>
          <Input id={`${row.slug}-video`} aria-describedby={`${row.slug}-video-help`} value={input} onChange={(e) => setInput(e.target.value)} className="h-11 text-base" />
          <p id={`${row.slug}-video-help`} className="text-sm text-muted-foreground">주소를 넣으면 영상 ID(11자)만 저장해요. 비우고 저장하면 영상이 내려가요.</p>
          {row.video_id && <a href={`https://www.youtube.com/watch?v=${row.video_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start text-accent underline">YouTube에서 확인</a>}
          <Button type="submit" className="self-start">영상 저장</Button>
        </>}
      </fieldset>
    </form>
  );
}

function IngredientsEditor({ row, db, onNotice, saveContent }: Props) {
  const usesContent = !!saveContent;
  type Item = IngredientDraft & { key: string; amount?: string };
  const [original, setOriginal] = useState<SavedIngredient[] | null>(null);
  const [items, setItems] = useState<Item[]>(() => usesContent ? (row.ingredients ?? []).map((item, index) => ({
    ...item, hard: !!item.hard, pantry: !!item.pantry, key: String(index),
  })) : []);
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
    if (!usesContent) void load();
  }, [load, usesContent]);

  async function save() {
    if (!original && !saveContent) return;
    const result = ingredientChanges(original ?? [], items);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      if (saveContent) {
        const ingredients = items.map(({ name, amount, hard, pantry, url }) => ({
          name: name.trim(), amount: amount?.trim(), ...(hard ? { hard } : {}),
          ...(pantry ? { pantry } : {}), ...(url ? { url } : {}),
        }));
        if (JSON.stringify(ingredients) !== JSON.stringify(row.ingredients)) await saveContent({ ingredients });
        onNotice(`${row.name} 재료를 저장했어요. '사이트에 반영'을 눌러 주세요.`);
        return;
      }
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
      if (!usesContent) await load();
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-lg font-bold">재료</legend>
        {!original && !usesContent ? <p className="text-base text-muted-foreground">불러오는 중이에요…</p> : <>
        {items.map((item, index) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
            <Label htmlFor={`${row.slug}-ingredient-${item.key}`}>재료 이름</Label>
            <Input id={`${row.slug}-ingredient-${item.key}`} required maxLength={60} className="h-11 text-base" value={item.name} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, name: e.target.value } : old))} />
            {usesContent && <>
              <Label htmlFor={`${row.slug}-amount-${item.key}`}>사용량</Label>
              <Input id={`${row.slug}-amount-${item.key}`} maxLength={100} className="h-11 text-base" value={item.amount ?? ""}
                onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, amount: e.target.value } : old))} />
            </>}
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
          <Button type="button" variant="outline" disabled={items.length >= (usesContent ? 20 : 30)} onClick={() => setItems([...items, { key: crypto.randomUUID(), name: "", hard: false, pantry: false }])}>재료 추가</Button>
          <Button type="submit">재료 저장</Button>
        </div>
        </>}
      </fieldset>
    </form>
  );
}

function StepsEditor(props: Props) {
  const { row, onNotice, saveContent } = props;
  const [items, setItems] = useState<(StepDraft & { key: string })[]>(() => row.steps.map((step, index) => ({ key: String(index), text: step.text, timer: step.timerMinutes?.toString() ?? "" })));
  const [saving, setSaving] = useState(false);
  async function save() {
    const result = cleanSteps(items);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      await saveDetails(props, JSON.stringify(result.value) === JSON.stringify(row.steps) && saveContent ? {} : { steps: result.value });
      onNotice(`${row.name} 조리법을 저장했어요. '사이트에 반영'을 눌러 주세요.`);
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
          <Button type="button" variant="outline" disabled={items.length >= (saveContent ? 12 : 20)} onClick={() => setItems([...items, { key: crypto.randomUUID(), text: "", timer: "" }])}>단계 추가</Button>
          <Button type="submit">조리법 저장</Button>
        </div>
      </fieldset>
    </form>
  );
}

function ConvenienceEditor(props: Props) {
  const { row, onNotice, saveContent } = props;
  const [items, setItems] = useState<(ConvenienceDraft & { key: string })[]>(() => convenienceDrafts(row.convenience).map((item, index) => ({ ...item, key: String(index) })));
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = cleanConvenience(items);
    if (result.error !== undefined) return onNotice(result.error);
    setSaving(true);
    try {
      await saveDetails(props, JSON.stringify(result.value) === JSON.stringify(row.convenience) && saveContent ? {} : { convenience: result.value });
      onNotice(`${row.name} 사서 맛보기를 저장했어요. '사이트에 반영'을 눌러 주세요.`);
    } catch (error) {
      onNotice(`저장하지 못했어요: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-lg font-bold">사서 맛보기</legend>
        <p className="text-[13px] text-muted-foreground">{saveContent ? "편의점·마트처럼 사서 맛볼 수 있는 곳을 관리해요." : "편의점·마트처럼 사서 맛볼 수 있는 곳이에요. 하나도 없으면 상세 화면에 이 구역이 안 보여요."}</p>
        {items.map((item, index) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3">
            <Label htmlFor={`${row.slug}-place-${item.key}`}>파는 곳</Label>
            <Input id={`${row.slug}-place-${item.key}`} aria-label={`사서 맛보기 ${index + 1} 파는 곳`} required maxLength={30} className="h-11 text-base" value={item.place} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, place: e.target.value } : old))} />
            <Label htmlFor={`${row.slug}-desc-${item.key}`}>설명</Label>
            <Input id={`${row.slug}-desc-${item.key}`} aria-label={`사서 맛보기 ${index + 1} 설명`} required maxLength={80} className="h-11 text-base" value={item.desc} onChange={(e) => setItems(items.map((old) => old.key === item.key ? { ...old, desc: e.target.value } : old))} />
            <div className="flex flex-wrap gap-2">
              <OrderButtons name={`사서 맛보기 ${index + 1}`} index={index} count={items.length} onMove={(direction) => setItems(moveItem(items, index, direction))} />
              <Button type="button" variant="outline" aria-label={`사서 맛보기 ${index + 1} 삭제`} onClick={() => setItems(items.filter((old) => old.key !== item.key))}>삭제</Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => {
            if (items.length >= 6) return onNotice("사서 맛보기는 6개까지 적을 수 있어요.");
            setItems([...items, { key: crypto.randomUUID(), place: "", desc: "" }]);
          }}>파는 곳 추가</Button>
          <Button type="submit">사서 맛보기 저장</Button>
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
