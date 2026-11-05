-- Puzzle modes (D45): two daily image puzzles — SINGLE (16×16 sprites) and
-- MULTIBLOCK (structure renders) — each with its own hidden answer per day.
-- Server-only table; clients resolve via /api/guess and get crops through
-- /api/puzzle/image, never the answer itself.

create table if not exists public.puzzle_answers (
  date date not null,
  dataset text not null,
  kind text not null check (kind in ('single', 'multi')),
  entry_id text not null,
  primary key (date, dataset, kind)
);

alter table public.puzzle_answers enable row level security;
-- No client policies: server code (service role / security definer) only.

-- Private bucket for puzzle crops; served only via /api/puzzle/image.
insert into storage.buckets (id, name, public)
values ('puzzles', 'puzzles', false)
on conflict (id) do nothing;

-- Extend daily generation: puzzle answers per kind, pools filtered by
-- structure (single -> single machines, multi -> multiblocks), full pool,
-- avoiding repeats in the same 60-day window.
create or replace function public.generate_daily_answers(days_ahead int default 30)
returns int
language plpgsql
security definer
as $$
declare
  rec record;
  d date;
  window_days int := 60;
  taken text[];
  pick text;
  generated int := 0;
begin
  if days_ahead < 1 or days_ahead > 365 then
    raise exception 'days_ahead out of range';
  end if;

  -- Classic dailies: easy + hard per dataset.
  for rec in
    select distinct e.dataset as ds, x.diff as diff
    from public.entries e
    cross join (values ('easy'), ('hard')) as x(diff)
  loop
    for d in
      select gs::date
      from generate_series(current_date::timestamptz, (current_date + days_ahead)::timestamptz, interval '1 day') gs
    loop
      if exists (select 1 from public.daily_answers where date = d and dataset = rec.ds and difficulty = rec.diff) then
        continue;
      end if;
      select array_agg(entry_id) into taken
      from public.daily_answers
      where dataset = rec.ds and difficulty = rec.diff and date between d - window_days and d + days_ahead;
      select e.id into pick
      from public.entries e
      where e.dataset = rec.ds
        and (rec.diff = 'hard' or e.difficulty = 'easy')
        and (taken is null or e.id <> all(taken))
      order by random() limit 1;
      if pick is null then
        select e.id into pick
        from public.entries e
        where e.dataset = rec.ds and (rec.diff = 'hard' or e.difficulty = 'easy')
        order by random() limit 1;
      end if;
      if pick is not null then
        insert into public.daily_answers (date, dataset, difficulty, entry_id) values (d, rec.ds, rec.diff, pick);
        generated := generated + 1;
      end if;
    end loop;
  end loop;

  -- Puzzle dailies: single + multi per dataset, pools by structure.
  for rec in
    select distinct e.dataset as ds, k.kind as kind
    from public.entries e
    cross join (values ('single'), ('multi')) as k(kind)
  loop
    for d in
      select gs::date
      from generate_series(current_date::timestamptz, (current_date + days_ahead)::timestamptz, interval '1 day') gs
    loop
      if exists (select 1 from public.puzzle_answers where date = d and dataset = rec.ds and kind = rec.kind) then
        continue;
      end if;
      select array_agg(entry_id) into taken
      from public.puzzle_answers
      where dataset = rec.ds and kind = rec.kind and date between d - window_days and d + days_ahead;
      select e.id into pick
      from public.entries e
      where e.dataset = rec.ds
        and e.attributes->>'structure' = case when rec.kind = 'single' then 'single' else 'multiblock' end
        and (taken is null or e.id <> all(taken))
      order by random() limit 1;
      if pick is null then
        select e.id into pick
        from public.entries e
        where e.dataset = rec.ds
          and e.attributes->>'structure' = case when rec.kind = 'single' then 'single' else 'multiblock' end
        order by random() limit 1;
      end if;
      if pick is not null then
        insert into public.puzzle_answers (date, dataset, kind, entry_id) values (d, rec.ds, rec.kind, pick);
        generated := generated + 1;
      end if;
    end loop;
  end loop;

  return generated;
end;
$$;

grant execute on function public.generate_daily_answers(int) to service_role;
