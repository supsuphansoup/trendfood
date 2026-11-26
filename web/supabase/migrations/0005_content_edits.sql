-- 공개 JSON 음식의 관리자 변경과 실제 사이트에 적용할 변경을 보관한다.
begin;

create table if not exists public.content_edits (
  id integer primary key default 1 check (id = 1),
  revision integer not null default 0 check (revision >= 0),
  draft jsonb not null default '{"foods": {}}' check (jsonb_typeof(draft->'foods') is not distinct from 'object'),
  published jsonb not null default '{"foods": {}}' check (jsonb_typeof(published->'foods') is not distinct from 'object')
);
insert into public.content_edits (id) values (1) on conflict do nothing;
alter table public.content_edits enable row level security;
revoke all on public.content_edits from public, anon, authenticated;
grant select, update (draft, published, revision) on public.content_edits to authenticated;
drop policy if exists "content_edits: admin access" on public.content_edits;
create policy "content_edits: admin access" on public.content_edits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.published_content_edits()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('foods', coalesce((
    select jsonb_object_agg(key,
      case when value->'hidden' = 'true'::jsonb or value->'draft' = 'true'::jsonb
        then jsonb_strip_nulls(jsonb_build_object('hidden', value->'hidden', 'draft', value->'draft'))
        else value
      end)
    from jsonb_each(published->'foods')
  ), '{}'::jsonb)) || jsonb_strip_nulls(jsonb_build_object('order', published->'order'))
  from public.content_edits where id = 1;
$$;
revoke all on function public.published_content_edits() from public, anon, authenticated;
grant execute on function public.published_content_edits() to anon, authenticated;

create table if not exists public.content_takedown_log (
  id bigint generated always as identity primary key,
  food_slug text not null check (char_length(food_slug) <= 80 and food_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  action text not null check (action in ('hide', 'show')),
  reason text not null default '' check (reason in ('', '원작자 삭제 요청', '권리 침해 신고', '내용 오류', '기타')),
  memo text not null default '' check (char_length(memo) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists content_takedown_log_food_idx on public.content_takedown_log (food_slug, created_at desc);
alter table public.content_takedown_log enable row level security;
revoke all on public.content_takedown_log from public, anon, authenticated;
grant select, update (reason, memo) on public.content_takedown_log to authenticated;
drop policy if exists "content_takedown_log: admin access" on public.content_takedown_log;
create policy "content_takedown_log: admin access" on public.content_takedown_log for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.log_content_takedown()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.content_takedown_log (food_slug, action)
  select coalesce(after.key, before.key),
    case when after.value->'hidden' = 'true'::jsonb then 'hide' else 'show' end
  from jsonb_each(new.draft->'foods') as after
  full join jsonb_each(old.draft->'foods') as before on after.key = before.key
  where coalesce(after.value->'hidden' = 'true'::jsonb, false)
    is distinct from coalesce(before.value->'hidden' = 'true'::jsonb, false);
  return new;
end;
$$;
revoke all on function public.log_content_takedown() from public, anon, authenticated;
drop trigger if exists content_takedown on public.content_edits;
create trigger content_takedown after update of draft on public.content_edits
  for each row when (old.draft is distinct from new.draft) execute function public.log_content_takedown();

commit;
