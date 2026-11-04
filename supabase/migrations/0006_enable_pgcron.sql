-- Arm the daily-answer cron schedule (idempotent).
-- 0002 only scheduled when pg_cron was already enabled; this guarantees the
-- extension exists and (re)arms the job — cron.schedule replaces by name.

create extension if not exists pg_cron;

do $$
begin
  perform cron.schedule(
    'gregdle-generate-daily',
    '5 0 * * *',
    $cron$ select public.generate_daily_answers(30); $cron$
  );
  raise notice 'gregdle-generate-daily armed (00:05 UTC daily).';
end $$;
