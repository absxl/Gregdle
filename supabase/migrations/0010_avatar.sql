-- Discord avatar sync (D27): profiles carry the Discord avatar URL, kept
-- fresh through a SECURITY DEFINER function that can ONLY touch that column
-- (display names stay immutable, D25).

alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.set_my_avatar(p_avatar_url text)
returns boolean
language sql
security definer
as $$
  update public.profiles
  set avatar_url = p_avatar_url
  where user_id = auth.uid();
  select true;
$$;

grant execute on function public.set_my_avatar(text) to authenticated;

-- profile_page: include the avatar.
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
        'avatar_url', p.avatar_url
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
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.profile_page(text) to anon, authenticated;
