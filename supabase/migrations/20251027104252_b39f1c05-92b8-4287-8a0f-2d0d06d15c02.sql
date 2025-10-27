-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the AI events scraper to run daily at 6:00 AM UTC
SELECT cron.schedule(
  'scrape-ai-events-daily',
  '0 6 * * *', -- Daily at 6:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/scrape-ai-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibXRudnh5d3BsZ3BsZG1seWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjYwOTMsImV4cCI6MjA3NzA0MjA5M30.Xt29HhlYkz3BJW9VlMBzNF-_hqmfiqOLF8HmonOxfvg"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);