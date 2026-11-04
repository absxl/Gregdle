-- Profile label customization + admin flair (D43):
-- - rank_label: the word before "// SINCE …" on the profile (default OPERATOR),
--   editable by the owner via update_my_profile.
-- - profile_page exposes is_admin so the UI can apply admin flair (rainbow
--   name, avatar ring) purely based on app_admins membership.

alter table public.profiles
  add column if not exists rank_label text;

create or replace function public.update_my_profile(
  p_title text,
  p_bio text,
  p_reddit text,
  p_twitter text,
  p_rank_label text default null
)
returns boolean
language sql
security definer
as $$
  update public.profiles
  set title = nullif(p_title, ''),
      bio = nullif(p_bio, ''),
      reddit = nullif(p_reddit, ''),
      twitter = nullif(p_twitter, ''),
      rank_label = nullif(p_rank_label, '')
  where user_id = auth.uid();
  select true;
$$;

grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

create or replace function public.profile_page(p_display_name text)
returns jsonb
language sql
security definer
stable
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'display_name', p.display_name,
        'joined', p.created_at,
        'avatar_url', p.avatar_url,
        'discord_id', p.discord_id,
        'title', p.title,
        'bio', p.bio,
        'reddit', p.reddit,
        'twitter', p.twitter,
        'rank_label', coalesce(p.rank_label, 'OPERATOR'),
        'is_admin', exists (
          select 1 from public.app_admins a where a.user_id = p.user_id
        )
      )
      from public.profiles p
      where p.display_name = p_display_name
    ),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', g.date,
        'difficulty', g.difficulty,
        'won', g.won,
        'guesses', array_length(g.guesses, 1),
        'hints', g.hints_used
      ) order by g.date desc)
      from public.game_results g
      join public.profiles pr on pr.user_id = g.user_id
      where pr.display_name = p_display_name
        and g.mode = 'daily'
    ), '[]'::jsonb),
    'backgrounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'path', b.storage_path,
        'title', b.title,
        'description', b.description,
        'source_url', b.source_url,
        'author', b.author_name
      ) order by b.created_at desc)
      from public.background_submissions b
      join public.profiles pr2 on pr2.user_id = b.user_id
      where pr2.display_name = p_display_name
        and b.status = 'approved'
    ), '[]'::jsonb)
  );
$$;
