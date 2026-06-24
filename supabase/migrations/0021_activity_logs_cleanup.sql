-- ============================================================================
-- 0021_activity_logs_cleanup.sql
-- Auto-delete activity logs older than 24 hours using pg_cron.
-- ============================================================================

-- Enable the pg_cron extension (idempotent).
create extension if not exists pg_cron with schema extensions;

-- Schedule hourly cleanup of activity_logs older than 24 hours.
-- The job is named 'cleanup_old_activity_logs' for easy identification.
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'cleanup_old_activity_logs'
  ) then
    perform cron.schedule(
      'cleanup_old_activity_logs',
      '0 * * * *',  -- every hour at minute 0
      $cron$ delete from activity_logs where created_at < now() - interval '24 hours' $cron$
    );
  end if;
end $$;
