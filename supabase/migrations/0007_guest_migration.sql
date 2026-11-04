-- Guest -> account migration (PRD §7.2): merge locally-played dailies into
-- game_results on first sign-in. Server-validated like a live submission:
-- every claimed win is re-checked against daily_answers; existing rows are
-- never overwritten (account wins on conflict — do nothing).

create or replace function public.migrate_guest_results(p_results jsonb)
returns int
language plpgsql
security definer
as $$
declare
  rec jsonb;
  answer_id text;
  guesses text[];
  migrated int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  for rec in select * from jsonb_array_elements(p_results)
  loop
    guesses := array(select jsonb_array_elements_text(rec->'guesses'));

    -- Validate the claimed win against the real answer for that day.
    select entry_id into answer_id
    from public.daily_answers
    where date = (rec->>'date')::date
      and dataset = rec->>'dataset'
      and difficulty = rec->>'difficulty';

    if (rec->>'won')::boolean and (
      answer_id is null
      or guesses is null
      or guesses[array_length(guesses, 1)] <> answer_id
    ) then
      continue; -- inconsistent record: skip silently
    end if;

    insert into public.game_results (
      user_id, date, dataset, difficulty, mode, guesses, won, hints_used, finished_at
    ) values (
      auth.uid(),
      (rec->>'date')::date,
      rec->>'dataset',
      rec->>'difficulty',
      'daily',
      guesses,
      (rec->>'won')::boolean,
      coalesce((rec->>'hints_used')::smallint, 0),
      coalesce((rec->>'finished_at')::timestamptz, now())
    )
    on conflict (user_id, date, dataset, difficulty, mode) do nothing;

    if found then
      migrated := migrated + 1;
    end if;
  end loop;

  return migrated;
end;
$$;

grant execute on function public.migrate_guest_results(jsonb) to authenticated;
