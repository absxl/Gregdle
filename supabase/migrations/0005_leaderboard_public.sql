-- Leaderboard public read + profile self-creation.
--
-- 0002 created the view WITH (security_invoker = true), which makes anon
-- reads hit game_results RLS and return nothing. Recreate with default
-- (owner) semantics so the granted anon SELECT actually sees rows; the view
-- only exposes winners' display names and stats, never unfinished games.

drop view if exists public.leaderboard_daily;

create view public.leaderboard_daily as
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

-- Users create their own profile on first login (display name picked client-side).
create policy "profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = user_id);
