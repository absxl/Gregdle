-- Drop the superseded 4-arg update_my_profile (0012) — its 5-arg successor
-- (0018, adds p_rank_label) makes RPC calls ambiguous for PostgREST.

drop function if exists public.update_my_profile(
  p_title text,
  p_bio text,
  p_reddit text,
  p_twitter text
);
