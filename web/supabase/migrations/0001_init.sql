-- 트렌드푸드 초기 스키마 (Supabase / Postgres)
-- 적용: Supabase 대시보드 → SQL Editor 에 붙여 넣고 실행 (또는 supabase db push)
-- 보안 원칙: 모든 테이블에 RLS. 방문자(anon)는 '게시된 음식'만 읽기, 쓰기는 admins 에 등록된 운영자만.

-- 운영자 목록 (Supabase Auth 사용자 중 관리자). 등록은 SQL Editor 에서만 한다:
--   insert into public.admins (user_id) select id from auth.users where email = '운영자@이메일';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 음식 (상세 페이지 하나 = 한 줄)
create table if not exists public.foods (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  hidden boolean not null default false,
  sort_order integer not null default 1000,
  name text not null check (char_length(name) between 1 and 30),
  change_label text not null default '새로 들어왔어요',
  why text not null default '' check (char_length(why) <= 200),
  summary text not null default '' check (char_length(summary) <= 600),
  category text not null check (category in ('디저트', '밥', '면', '분식', '간식')),
  tags text[] not null default '{}',
  cook_minutes integer not null default 10 check (cook_minutes between 1 and 1440),
  cook_label text not null default '',
  difficulty text not null default '쉬움' check (difficulty in ('쉬움', '보통', '어려움')),
  servings text not null default '',
  likes integer not null default 0,
  videos integer not null default 0,
  multiplier numeric(6, 2) not null default 1,
  trend integer[] not null default '{}',
  image text not null default 'dubai',
  alt text not null default '',
  hero_image text,
  hero_alt text,
  steps jsonb not null default '[]'::jsonb,
  tip text not null default '',
  convenience jsonb not null default '[]'::jsonb,
  ai_drafted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 재료 (쿠팡 링크·참고 가격은 운영자가 등록)
create table if not exists public.ingredients (
  id bigint generated always as identity primary key,
  food_slug text not null references public.foods (slug) on delete cascade on update cascade,
  position integer not null default 0,
  name text not null check (char_length(name) between 1 and 60),
  price integer check (price between 0 and 10000000),
  hard boolean not null default false,
  pantry boolean not null default false,
  url text check (url is null or url ~ '^https://([a-z0-9-]+\.)*(coupang\.com|coupa\.ng)(/|$)'),
  unique (food_slug, name)
);
create index if not exists ingredients_food_idx on public.ingredients (food_slug, position);

-- 트렌드 후보 큐 (수집 파이프라인이 넣고, 운영자가 승인·반려)
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  normalized text not null,
  category text not null default '간식',
  note text not null default '',
  source text not null default '',
  origin text not null default 'manual' check (origin in ('manual', 'pipeline')),
  status text not null default '대기' check (status in ('대기', '승인', '반려')),
  score numeric(6, 2),
  signals jsonb not null default '{}'::jsonb,
  draft jsonb,
  created_at timestamptz not null default now(),
  week date not null default date_trunc('week', now())::date,
  unique (normalized, week)
);

-- 게시 요청 기록 (사이트 다시 빌드 요청, 너무 잦은 요청 막기용)
create table if not exists public.publish_requests (
  id bigint generated always as identity primary key,
  requested_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- 파이프라인 실행 기록 (관리자 화면에서 실패·AI 크레딧 소진 경고)
create table if not exists public.pipeline_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  summary jsonb not null default '{}'::jsonb
);

-- 방문자가 읽는 공개 목록 (게시됨 + 숨기지 않음). 빌드 스크립트가 이것만 읽는다.
create or replace view public.published_foods
with (security_invoker = true)
as
select f.*, coalesce(
  (select jsonb_agg(jsonb_build_object(
      'name', i.name, 'price', i.price, 'hard', i.hard, 'pantry', i.pantry, 'url', i.url
    ) order by i.position)
   from public.ingredients i where i.food_slug = f.slug),
  '[]'::jsonb) as ingredients
from public.foods f
where f.status = 'published' and not f.hidden;

-- ── RLS ──────────────────────────────────────────────
alter table public.admins enable row level security;
alter table public.foods enable row level security;
alter table public.ingredients enable row level security;
alter table public.candidates enable row level security;
alter table public.publish_requests enable row level security;
alter table public.pipeline_runs enable row level security;

-- admins: 본인이 관리자인지 확인만 가능 (추가·삭제는 SQL Editor 에서)
drop policy if exists "admins: read self" on public.admins;
create policy "admins: read self" on public.admins for select to authenticated using (user_id = auth.uid());

-- foods: 누구나 게시된 것만 읽기, 관리자는 전부
drop policy if exists "foods: public read published" on public.foods;
create policy "foods: public read published" on public.foods for select to anon, authenticated
  using ((status = 'published' and not hidden) or public.is_admin());
drop policy if exists "foods: admin write" on public.foods;
create policy "foods: admin write" on public.foods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ingredients: 게시된 음식의 재료만 공개
drop policy if exists "ingredients: public read" on public.ingredients;
create policy "ingredients: public read" on public.ingredients for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.foods f where f.slug = food_slug and f.status = 'published' and not f.hidden)
  );
drop policy if exists "ingredients: admin write" on public.ingredients;
create policy "ingredients: admin write" on public.ingredients for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- candidates / publish_requests / pipeline_runs: 관리자만 (파이프라인은 service_role 키로 RLS 우회)
drop policy if exists "candidates: admin all" on public.candidates;
create policy "candidates: admin all" on public.candidates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "publish_requests: admin all" on public.publish_requests;
create policy "publish_requests: admin all" on public.publish_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "pipeline_runs: admin read" on public.pipeline_runs;
create policy "pipeline_runs: admin read" on public.pipeline_runs for select to authenticated
  using (public.is_admin());

grant select on public.published_foods to anon, authenticated;

-- 수정 시각 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists foods_touch on public.foods;
create trigger foods_touch before update on public.foods
  for each row execute function public.touch_updated_at();
