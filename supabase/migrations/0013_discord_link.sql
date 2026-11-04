-- Profile avatars link to the player's Discord profile (D31): store the
-- Discord provider id alongside the avatar.

alter table public.profiles
  add column if not exists discord_id text;

create or replace function public.set_my_avatar(p_avatar_url text, p_discord_id text default null)
returns boolean
language sql
security definer
as $$
  update public.profiles
  set avatar_url = p_avatar_url,
      discord_id = coalesce(p_discord_id, discord_id)
  where user_id = auth.uid();
  select true;
$$;

grant execute on function public.set_my_avatar(text, text) to authenticated;

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
        'description', b.description
      ) order by b.created_at desc)
      from public.background_submissions b
      join public.profiles pr2 on pr2.user_id = b.user_id
      where pr2.display_name = p_display_name
        and b.status = 'approved'
    ), '[]'::jsonb)
  );
$$;
