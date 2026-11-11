export const photoLicenses = ['직접 촬영', 'CC0', 'CC BY', 'CC BY-SA', '공공누리 1유형', 'Unsplash', 'Pexels', 'Pixabay'] as const;
export type PhotoLicense = (typeof photoLicenses)[number];
export type Photo = {
  id: string;
  path: string;
  width: number;
  height: number;
  credit: string;
  source_url: string;
  license: PhotoLicense;
  created_at: string;
};
export type PhotoDraft = { credit: string; source_url: string; license: PhotoLicense; confirmed: boolean };
export type PublishedPhoto = Omit<Photo, 'created_at'>;

export function uploadedPhotoIds(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)))];
}

export function validPhotoPath(path: string): boolean {
  return /^[0-9a-f-]{36}\.webp$/.test(path);
}

export function publicPhotoUrl(supabaseUrl: string, path: string): string {
  if (!validPhotoPath(path)) throw new Error('사진 경로 형식 오류');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/food-photos/${path}`;
}
export const photoSizeError = '사진을 충분히 줄이지 못했어요. 더 작은 사진으로 올려 주세요.';

export function photoFileError(file: { type: string; size: number } | undefined): string | undefined {
  if (!file) return '사진 파일을 골라 주세요.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'JPG·PNG·WebP 사진만 올릴 수 있어요. 아이폰 사진(HEIC)은 JPG 로 바꿔 주세요.';
  if (file.size > 20 * 1024 * 1024) return '사진이 너무 커요(20MB 까지).';
}

export function cleanPhotoDraft(draft: PhotoDraft) {
  const credit = draft.credit.trim();
  const source_url = draft.source_url.trim();
  if (!credit) return { error: '출처 표시를 적어 주세요.' };
  if ((draft.license !== '직접 촬영' || source_url !== '') && !source_url.startsWith('https://')) return { error: '원본 주소를 https:// 로 시작하게 적어 주세요.' };
  if (!draft.confirmed) return { error: '사진을 써도 되는지 확인하고 체크해 주세요.' };
  return { value: { credit, source_url, license: draft.license } };
}

export function photoDimensions(width: number, height: number) {
  const scale = Math.min(1, 1600 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function photoLabel(photo: Pick<Photo, 'credit' | 'created_at'>) {
  const date = new Date(photo.created_at);
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).formatToParts(date);
  return `올린 사진 · ${photo.credit} · ${parts.find((part) => part.type === 'month')!.value}/${parts.find((part) => part.type === 'day')!.value}`;
}
