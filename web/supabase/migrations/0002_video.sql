-- 원본 영상 ID 열과 공개 뷰를 추가·갱신한다. Supabase SQL Editor 에 붙여 넣고 Run.
begin;

alter table public.foods add column if not exists video_id text;
alter table public.foods drop constraint if exists foods_video_id_check;
alter table public.foods add constraint foods_video_id_check
  check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$');

-- 새 열을 포함하도록 뷰를 다시 만든다. 원래의 RLS·공개 조건을 유지한다.
drop view if exists public.published_foods;
create view public.published_foods
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

grant select on public.published_foods to anon, authenticated;

commit;
