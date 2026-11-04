-- Daily answer generation + server-side game functions.
--
-- generate_daily_answers() fills the next N days for every (dataset,
-- difficulty) pair from the entries pool, avoiding repeats within the
-- configured window (PRD §7.3). Pools per PRD §4.5: easy -> entries tagged
-- easy; hard -> all entries. Scheduled daily at 00:05 UTC via pg_cron.

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
    for d in select generate_series(current_date + 1, current_date + days_ahead, 1)
    loop
      if exists (
        select 1 from public.daily_answers
        where date = d and dataset = rec.ds and difficulty = rec.diff
      ) then
        continue; -- already generated (idempotent re-runs)
      end if;

      -- Answers used within the repeat window are excluded.
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
        -- Pool exhausted within the window: allow repeats rather than fail.
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

-- Server-validated daily result submission (anti-cheat, PRD §7.3):
-- the caller's claimed win must match the hidden answer for that date.
create or replace function public.submit_daily_result(
  p_dataset text,
  p_difficulty text,
  p_date date,
  p_guesses text[],
  p_won boolean,
  p_hints_used int default 0
)
returns boolean
language plpgsql
security definer
as $$
declare
  answer_id text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select entry_id into answer_id
  from public.daily_answers
  where date = p_date and dataset = p_dataset and difficulty = p_difficulty;

  if answer_id is null then
    raise exception 'no daily answer for that (date, dataset, difficulty)';
  end if;

  if p_won and (array_length(p_guesses, 1) is null or p_guesses[array_length(p_guesses, 1)] <> answer_id) then
    raise exception 'claimed win does not match the daily answer';
  end if;

  insert into public.game_results (user_id, date, dataset, difficulty, mode, guesses, won, hints_used)
  values (
    auth.uid(), p_date, p_dataset, p_difficulty, 'daily', p_guesses, p_won, p_hints_used
  )
  on conflict (user_id, date, dataset, difficulty, mode) do nothing;

  return true;
end;
$$;

grant execute on function public.submit_daily_result(text, text, date, text[], boolean, int) to authenticated;

-- Leaderboard: winning daily runs per (dataset, difficulty, date), unhinted
-- ranked above hinted (D6), then fewer guesses, then earlier finish.
create or replace view public.leaderboard_daily
with (security_invoker = true) as
select
  g.dataset,
  g.difficulty,
  g.date,
  p.display_name,
  g.hints_used,
  array_length(g.guesses, 1) as guess_count,
  g.finished_at,
  rank() over (
    partition by g.dataset, g.difficulty, g.date
    order by g.hints_used asc, array_length(g.guesses, 1) asc nulls last, g.finished_at asc
  ) as rank
from public.game_results g
join public.profiles p on p.user_id = g.user_id
where g.mode = 'daily' and g.won;

grant select on public.leaderboard_daily to anon, authenticated;

-- Nightly generation schedule (00:05 UTC). pg_cron must be enabled first
-- (Database -> Extensions in the dashboard).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'gregdle-generate-daily',
      '5 0 * * *',
      $cron$ select public.generate_daily_answers(30); $cron$
    );
  else
    raise notice 'pg_cron not enabled yet; run: create extension if not exists pg_cron; then call cron.schedule manually or re-run this migration section.';
  end if;
end $$;
