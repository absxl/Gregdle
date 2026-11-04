-- Profile extras (D29): owner-editable title/bio/socials (display name stays
-- immutable, D25), background submissions gain title/description, and
-- profile_page returns everything the public profile shows — including the
-- user's approved background gallery.

alter table public.profiles
  add column if not exists title text,
  add column if not exists bio text,
  add column if not exists reddit text,
  add column if not exists twitter text;

alter table public.background_submissions
  add column if not exists title text,
  add column if not exists description text;

-- Owner-scoped profile edit: ONLY these four fields, never the name.
create or replace function public.update_my_profile(
  p_title text,
  p_bio text,
  p_reddit text,
  p_twitter text
)
returns boolean
language sql
security definer
as $$
  update public.profiles
  set title = nullif(p_title, '') ,
      bio = nullif(p_bio, ''),
      reddit = nullif(p_reddit, ''),
      twitter = nullif(p_twitter, '')
  where user_id = auth.uid();
  select true;
$$;

grant execute on function public.update_my_profile(text, text, text, text) to authenticated;

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
