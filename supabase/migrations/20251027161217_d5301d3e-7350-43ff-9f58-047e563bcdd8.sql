-- Increase comment processing frequency from hourly to every 5 minutes
-- First, remove the old hourly job
SELECT cron.unschedule('process-pending-comments-hourly');

-- Create new job that runs every 5 minutes to clear backlog faster
SELECT cron.schedule(
  'process-pending-comments-frequent',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/process-pending-comments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibXRudnh5d3BsZ3BsZG1seWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjYwOTMsImV4cCI6MjA3NzA0MjA5M30.Xt29HhlYkz3BJW9VlMBzNF-_hqmfiqOLF8HmonOxfvg"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);