-- Community backgrounds (D28): Discord-authenticated submissions, owner
-- approval, rotating carousel with credits. Files live in the public
-- `backgrounds` storage bucket under unguessable per-user paths; approval
-- only flips status (no file moves).

-- Sole approver: the site owner's account.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;
-- No client policies: only SECURITY DEFINER functions consult this table.

insert into public.app_admins (user_id)
select user_id from public.profiles where display_name = 'amidnightgospel'
on conflict do nothing;

-- Submissions ledger.
create table if not exists public.background_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  storage_path text not null, -- e.g. submissions/<uid>/<file>.jpg
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists background_submissions_status_idx
  on public.background_submissions (status, created_at desc);

alter table public.background_submissions enable row level security;

create policy "backgrounds: public read approved"
  on public.background_submissions for select
  using (status = 'approved');

create policy "backgrounds: author reads own"
  on public.background_submissions for select
  using (user_id = auth.uid());

create policy "backgrounds: admins read all"
  on public.background_submissions for select
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy "backgrounds: authenticated submit own"
  on public.background_submissions for insert
  with check (user_id = auth.uid() and status = 'pending');

-- Storage bucket (public read; uploads constrained by object policies below).
insert into storage.buckets (id, name, public)
values ('backgrounds', 'backgrounds', true)
on conflict (id) do nothing;

create policy "backgrounds storage: anyone read"
  on storage.objects for select
  using (bucket_id = 'backgrounds');

create policy "backgrounds storage: upload under own submissions path"
  on storage.objects for insert
  with check (
    bucket_id = 'backgrounds'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Moderation RPCs (admin-gated).
create or replace function public.approve_background(p_id uuid)
returns boolean
language sql
security definer
as $$
  update public.background_submissions
  set status = 'approved', decided_at = now()
  where id = p_id
    and exists (select 1 from public.app_admins a where a.user_id = auth.uid());
  select true;
$$;

create or replace function public.reject_background(p_id uuid)
returns boolean
language sql
security definer
as $$
  update public.background_submissions
  set status = 'rejected', decided_at = now()
  where id = p_id
    and exists (select 1 from public.app_admins a where a.user_id = auth.uid());
  select true;
$$;

create or replace function public.am_i_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

grant execute on function public.approve_background(uuid) to authenticated;
grant execute on function public.reject_background(uuid) to authenticated;
grant execute on function public.am_i_admin() to authenticated;
