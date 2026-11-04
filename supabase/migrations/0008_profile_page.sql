-- Public profile data (D24): everything a profile page shows, readable by
-- anyone (leaderboard names are public by design). SECURITY DEFINER exposes
-- only finished daily results + profile fields, never unfinished games.

create or replace function public.profile_page(p_display_name text)
returns jsonb
language sql
security definer
stable
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object('display_name', p.display_name, 'joined', p.created_at)
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
