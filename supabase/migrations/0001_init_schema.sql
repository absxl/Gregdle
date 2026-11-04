-- Gregdle initial schema (PRD §7.1, as amended: 5 datasets — D12).
-- Applied remotely via `supabase db push`.

-- ---------------------------------------------------------------- entries --
-- Read-only catalog mirrored from /data JSON by the seed script.
create table if not exists public.entries (
  dataset text not null check (dataset in (
    'gtnh:machines', 'gtnh:items',
    'gtceu:materials', 'gtceu:machines', 'gtceu:items'
  )),
  id text not null,
  name text not null,
  aliases text[] not null default '{}',
  image text,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  attributes jsonb not null,
  source_url text not null,
  primary key (dataset, id)
);

create index if not exists entries_dataset_difficulty_idx
  on public.entries (dataset, difficulty);

-- --------------------------------------------------------- daily_answers --
-- Pre-generated answers. NEVER exposed to clients: RLS is enabled with no
-- permissive policy, so anon/authenticated roles cannot read it. All access
-- goes through SECURITY DEFINER functions that reveal only what the game
-- allows (comparisons, hints, and the answer once the game is over).
create table if not exists public.daily_answers (
  date date not null,
  dataset text not null,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  entry_id text not null,
  generated_at timestamptz not null default now(),
  primary key (date, dataset, difficulty)
);

alter table public.daily_answers enable row level security;

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read/update"
  on public.profiles for select using (auth.uid() = user_id);
create policy "profiles: owner update"
  on public.profiles for update using (auth.uid() = user_id);

-- Users see profiles (needed for leaderboard names) but only owners edit.
create policy "profiles: public read"
  on public.profiles for select using (true);
-- Note: two SELECT policies — Supabase ORs them; owners and public both read.

-- ------------------------------------------------------------ game_results --
create table if not exists public.game_results (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  date date not null,
  dataset text not null,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  mode text not null check (mode in ('daily', 'endless')),
  guesses text[] not null,
  won boolean not null,
  hints_used smallint not null default 0,
  finished_at timestamptz not null default now(),
  primary key (user_id, date, dataset, difficulty, mode)
);

alter table public.game_results enable row level security;

create policy "game_results: owner read"
  on public.game_results for select using (auth.uid() = user_id);

-- Writes happen only through submit_daily_result() (server-validated),
-- never directly by clients: no INSERT policy.

create index if not exists game_results_leaderboard_idx
  on public.game_results (dataset, difficulty, date, won, hints_used, finished_at);

-- ---------------------------------------------------------------- entries RLS --
alter table public.entries enable row level security;
create policy "entries: public read" on public.entries for select using (true);
