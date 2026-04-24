-- 1) Enable pg_cron extension (required for scheduled jobs)
create extension if not exists pg_cron;

-- 2) Function to cleanup expired notifications
create or replace function public.cleanup_expired_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where expires_at is not null
    and expires_at < now();
end;
$$;

-- 3) (Re)Schedule daily cleanup at 02:00 (idempotent)
do $$
declare
  v_job_id integer;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'cleanup-notifications'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'cleanup-notifications',
    '0 2 * * *',
    'select public.cleanup_expired_notifications();'
  );
end;
$$;