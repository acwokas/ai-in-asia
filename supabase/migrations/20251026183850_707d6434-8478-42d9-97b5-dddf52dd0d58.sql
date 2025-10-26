-- Enable pg_cron and pg_net extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule stock price updates every 5 minutes during market hours
-- Market hours: 9:30 AM - 4:00 PM ET (Mon-Fri)
-- This runs every 5 minutes between 14:30-21:00 UTC (9:30 AM-4:00 PM ET)
SELECT cron.schedule(
  'update-stock-prices',
  '*/5 14-21 * * 1-5', 
  $$
  SELECT net.http_post(
    url:='https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/fetch-stock-data',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibXRudnh5d3BsZ3BsZG1seWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjYwOTMsImV4cCI6MjA3NzA0MjA5M30.Xt29HhlYkz3BJW9VlMBzNF-_hqmfiqOLF8HmonOxfvg"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
