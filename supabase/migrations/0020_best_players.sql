-- Best players (all-time) leaderboard.
--
-- Ranks players per dataset/difficulty by their longest consecutive run of
-- daily wins. Hinted wins count toward the streak and the 3-win threshold;
-- players below the threshold stay off the board.
--
-- Same owner-semantics view + anon grant as leaderboard_daily (0005): the
-- view only exposes display names and aggregate stats, never raw rows, so
-- default (owner) semantics are required for anon reads to see anything.

create view public.leaderboard_best as
with wins as (
  select
    g.user_id,
    g.dataset,
    g.difficulty,
    p.display_name,
    g.date
  from public.game_results g
  join public.profiles p on p.user_id = g.user_id
  where g.mode = 'daily' and g.won
),
-- Gaps-and-islands: consecutive dates shift by the same amount, so
-- date - row_number() is constant within a streak.
streaks as (
  select
    w.*,
    w.date
      - (row_number() over (
          partition by w.user_id, w.dataset, w.difficulty
          order by w.date
        ))::int as grp
  from wins w
),
streak_lens as (
  select
    s.user_id,
    s.dataset,
    s.difficulty,
    s.grp,
    count(*) as len
  from streaks s
  group by s.user_id, s.dataset, s.difficulty, s.grp
),
agg as (
  select
    s.user_id,
    s.dataset,
    s.difficulty,
    s.display_name,
    count(*) as win_count,
    min(s.date) as first_win,
    max(sl.len) as best_streak
  from streaks s
  join streak_lens sl
    on sl.user_id = s.user_id
   and sl.dataset = s.dataset
   and sl.difficulty = s.difficulty
   and sl.grp = s.grp
  group by s.user_id, s.dataset, s.difficulty, s.display_name
)
select
  a.dataset,
  a.difficulty,
  a.display_name,
  a.best_streak,
  a.win_count,
  rank() over (
    partition by a.dataset, a.difficulty
    order by a.best_streak desc, a.win_count desc, a.first_win asc
  ) as rank
from agg a
where a.win_count >= 3;

grant select on public.leaderboard_best to anon, authenticated;
