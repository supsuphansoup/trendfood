-- 관리자 전용 내림 기록과 사유를 보관한다. Supabase SQL Editor 에 붙여 넣고 Run.
begin;

create table if not exists public.takedown_log (
  id bigint generated always as identity primary key,
  food_slug text not null references public.foods (slug) on delete cascade,
  action text not null check (action in ('hide', 'show')),
  reason text not null default '' check (reason in ('', '원작자 삭제 요청', '권리 침해 신고', '내용 오류', '기타')),
  memo text not null default '' check (char_length(memo) <= 200),
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists takedown_log_food_idx on public.takedown_log (food_slug, created_at desc);

alter table public.takedown_log enable row level security;

drop policy if exists "takedown_log: admin read" on public.takedown_log;
create policy "takedown_log: admin read" on public.takedown_log for select to authenticated
  using (public.is_admin());

drop policy if exists "takedown_log: admin insert" on public.takedown_log;
create policy "takedown_log: admin insert" on public.takedown_log for insert to authenticated
  with check (public.is_admin());

drop policy if exists "takedown_log: admin update" on public.takedown_log;
create policy "takedown_log: admin update" on public.takedown_log for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;
