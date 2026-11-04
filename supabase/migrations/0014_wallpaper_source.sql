-- Seeded wallpapers from external sources (D33): when source_url is set the
-- credit badge links there (e.g. gtnewhorizons.com) instead of a /u profile.

alter table public.background_submissions
  add column if not exists source_url text;

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
        'twitter', p.twitter
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
        'source_url', b.source_url
      ) order by b.created_at desc)
      from public.background_submissions b
      join public.profiles pr2 on pr2.user_id = b.user_id
      where pr2.display_name = p_display_name
        and b.status = 'approved'
    ), '[]'::jsonb)
  );
$$;
