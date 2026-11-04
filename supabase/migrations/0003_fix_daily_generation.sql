-- Fix generate_daily_answers: generate_series(date, date, int) does not
-- exist in Postgres — use the (timestamptz, timestamptz, interval) overload
-- and cast back to date.

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

  for rec in
    select distinct e.dataset as ds, x.diff as diff
    from public.entries e
    cross join (values ('easy'), ('hard')) as x(diff)
  loop
    for d in
      select gs::date
      from generate_series(
        (current_date + 1)::timestamptz,
        (current_date + days_ahead)::timestamptz,
        interval '1 day'
      ) gs
    loop
      if exists (
        select 1 from public.daily_answers
        where date = d and dataset = rec.ds and difficulty = rec.diff
      ) then
        continue; -- already generated (idempotent re-runs)
      end if;

      select array_agg(entry_id) into taken
      from public.daily_answers
      where dataset = rec.ds
        and difficulty = rec.diff
        and date between d - window_days and d + days_ahead;

      select e.id into pick
      from public.entries e
      where e.dataset = rec.ds
        and (rec.diff = 'hard' or e.difficulty = 'easy')
        and (taken is null or e.id <> all(taken))
      order by random()
      limit 1;

      if pick is null then
        select e.id into pick
        from public.entries e
        where e.dataset = rec.ds
          and (rec.diff = 'hard' or e.difficulty = 'easy')
        order by random()
        limit 1;
      end if;

      if pick is not null then
        insert into public.daily_answers (date, dataset, difficulty, entry_id)
        values (d, rec.ds, rec.diff, pick);
        generated := generated + 1;
      end if;
    end loop;
  end loop;

  return generated;
end;
$$;

grant execute on function public.generate_daily_answers(int) to service_role;

-- Schedule if pg_cron is now/already enabled (idempotent by name).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'gregdle-generate-daily',
      '5 0 * * *',
      $cron$ select public.generate_daily_answers(30); $cron$
    );
  else
    raise notice 'pg_cron still not enabled; the app calls generate_daily_answers from the seed script and the guess API falls back to deterministic picks.';
  end if;
end $$;
