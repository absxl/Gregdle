-- Guess counters (D41): per-guess events power the "N players also guessed
-- this today" readout, and an all-time totals view feeds the give-up
-- counter on home + game page. Both are anonymized aggregates only —
-- guess events carry no user id and are written server-side exclusively.

create table if not exists public.guess_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  dataset text not null,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  guess_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists guess_events_lookup_idx
  on public.guess_events (date, dataset, difficulty, guess_id);

alter table public.guess_events enable row level security;
-- No client policies: only the server (service role) writes; counts are
-- returned inside /api/guess responses.

-- All-time totals for the give-up counter.
create view public.global_totals as
select
  count(*)::int as total_plays,
  sum(case when gave_up then 1 else 0 end)::int as total_gave_ups
from public.daily_stat_events;

grant select on public.global_totals to anon, authenticated;
