-- Global daily stats (D40): anonymized, aggregate-only tracking of EVERY
-- finished daily — guests included. No user ids, no IPs, no free text:
-- just per-game counters the client sends once when a daily ends.
-- Insert-only for clients; readable only as pre-aggregated rows.

create table if not exists public.daily_stat_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  dataset text not null,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  won boolean not null,
  gave_up boolean not null,
  hints_used smallint not null default 0 check (hints_used between 0 and 10),
  guess_count smallint not null check (guess_count between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists daily_stat_events_date_idx
  on public.daily_stat_events (date, dataset, difficulty);

alter table public.daily_stat_events enable row level security;

-- Insert-only: clients (guest or signed-in) may add events, never read raw.
create policy "daily stats: anyone insert"
  on public.daily_stat_events for insert
  with check (true);

-- Pre-aggregated, safe to expose.
create view public.global_daily_stats as
select
  date,
  dataset,
  difficulty,
  count(*)::int as plays,
  sum(case when won then 1 else 0 end)::int as wins,
  sum(case when gave_up then 1 else 0 end)::int as gave_ups,
  sum(case when hints_used > 0 then 1 else 0 end)::int as hinted,
  round(avg(guess_count)::numeric, 1)::float8 as avg_guesses
from public.daily_stat_events
group by date, dataset, difficulty;

grant select on public.global_daily_stats to anon, authenticated;
