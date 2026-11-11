-- 운영자가 올린 사진의 출처·라이선스와 WebP 전용 공개 저장소를 준비한다.
begin;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  path text not null unique check (path ~ '^[0-9a-f-]{36}\.webp$'),
  width integer not null check (width between 1 and 4000),
  height integer not null check (height between 1 and 4000),
  credit text not null check (char_length(credit) between 1 and 100),
  source_url text not null default '' check (source_url = '' or source_url ~ '^https://'),
  license text not null check (license in ('직접 촬영', 'CC0', 'CC BY', 'CC BY-SA', '공공누리 1유형', 'Unsplash', 'Pexels', 'Pixabay')),
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

drop policy if exists "photos: public read" on public.photos;
create policy "photos: public read" on public.photos for select to anon, authenticated
  using (true);

drop policy if exists "photos: admin insert" on public.photos;
create policy "photos: admin insert" on public.photos for insert to authenticated
  with check (public.is_admin());

drop policy if exists "photos: admin update" on public.photos;
create policy "photos: admin update" on public.photos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "photos: admin delete" on public.photos;
create policy "photos: admin delete" on public.photos for delete to authenticated
  using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-photos', 'food-photos', true, 1048576, array['image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 사진 정보 저장 실패 시 올린 파일을 지울 수 있도록 관리자에게만 객체 조회를 허용한다.
drop policy if exists "food-photos: admin read" on storage.objects;
create policy "food-photos: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'food-photos' and public.is_admin());

drop policy if exists "food-photos: admin insert" on storage.objects;
create policy "food-photos: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'food-photos' and public.is_admin());

drop policy if exists "food-photos: admin delete" on storage.objects;
create policy "food-photos: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'food-photos' and public.is_admin());

commit;
