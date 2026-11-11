import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanPhotoDraft, photoDimensions, photoFileError, photoLicenses, photoSizeError, type PhotoLicense } from "@/data/photos.ts";

async function resizePhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const dimensions = photoDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    Object.assign(canvas, dimensions);
    const context = canvas.getContext("2d");
    if (!context) throw new Error(photoSizeError);
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    for (const quality of [0.82, 0.7, 0.6]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob?.type === "image/webp" && blob.size <= 1024 * 1024) return { blob, ...dimensions };
    }
    throw new Error(photoSizeError);
  } finally {
    bitmap.close();
  }
}

export function PhotoUploader({ slug, db, onNotice, onUploaded }: { slug: string; db: SupabaseClient; onNotice: (message: string) => void; onUploaded: (id: string) => Promise<void> }) {
  const [file, setFile] = useState<File>();
  const [license, setLicense] = useState<PhotoLicense>("직접 촬영");
  const [credit, setCredit] = useState("트렌드푸드 직접 촬영");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function upload() {
    const fileError = photoFileError(file);
    if (fileError) return onNotice(fileError);
    const result = cleanPhotoDraft({ license, credit, source_url: source, confirmed });
    if (result.error !== undefined) return onNotice(result.error);
    setUploading(true);
    try {
      const { blob, width, height } = await resizePhoto(file!);
      const id = crypto.randomUUID();
      const path = `${id}.webp`;
      const bucket = db.storage.from("food-photos");
      // ArrayBuffer 로 보내야 multipart 대신 image/webp 요청이 된다.
      const { error: uploadError } = await bucket.upload(path, await blob.arrayBuffer(), { contentType: "image/webp", upsert: false });
      if (uploadError) throw uploadError;
      try {
        const { error } = await db.from("photos").insert({ id, path, width, height, ...result.value });
        if (error) throw error;
      } catch (error) {
        const { error: cleanupError } = await bucket.remove([path]);
        if (cleanupError) throw new Error(`${(error as Error).message}; ${cleanupError.message}`);
        throw error;
      }
      await onUploaded(id);
      onNotice("사진을 올렸어요. [사진 저장]을 눌러 이 음식에 적용해 주세요.");
    } catch (error) {
      const message = (error as Error).message;
      onNotice(message === photoSizeError ? message : `사진을 올리지 못했어요: ${message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void upload(); }}>
      <fieldset disabled={uploading} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-base font-bold">새 사진 올리기</legend>
        <p className="text-sm text-muted-foreground">구글 이미지 검색·인스타·유튜브 썸네일·블로그·쿠팡 상품 사진은 올리면 안 돼요. 직접 찍었거나 상업 이용이 허용된 사진만 올려 주세요.</p>
        <Label htmlFor={`${slug}-photo-file`}>사진 파일</Label>
        <Input id={`${slug}-photo-file`} type="file" accept="image/jpeg,image/png,image/webp" className="h-11 min-w-0 text-base file:min-h-11" onChange={(event) => setFile(event.target.files?.[0])} />
        <Label htmlFor={`${slug}-photo-license`}>라이선스</Label>
        <select id={`${slug}-photo-license`} value={license} onChange={(event) => setLicense(event.target.value as PhotoLicense)} className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-base">
          {photoLicenses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Label htmlFor={`${slug}-photo-credit`}>출처 표시 (화면에 그대로 나와요, 100자)</Label>
        <Input id={`${slug}-photo-credit`} required maxLength={100} value={credit} onChange={(event) => setCredit(event.target.value)} className="h-11 text-base" />
        <Label htmlFor={`${slug}-photo-source`}>원본 주소 (https://, 직접 촬영이면 비워 두기)</Label>
        <Input id={`${slug}-photo-source`} type="url" required={license !== "직접 촬영"} value={source} onChange={(event) => setSource(event.target.value)} className="h-11 text-base" />
        <Label htmlFor={`${slug}-photo-confirm`} className="flex min-h-11 items-center gap-2">
          <input id={`${slug}-photo-confirm`} type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="size-5 shrink-0 accent-primary" />
          이 사진을 광고가 있는 사이트에 써도 되는 것을 확인했어요.
        </Label>
        <Button type="submit" className="self-start">사진 올리기</Button>
      </fieldset>
    </form>
  );
}
