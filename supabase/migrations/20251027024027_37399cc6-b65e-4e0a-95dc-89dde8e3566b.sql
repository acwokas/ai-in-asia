-- Create table for pending comment generation jobs
CREATE TABLE IF NOT EXISTS public.pending_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  comment_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pending_comments ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage pending comments
CREATE POLICY "Admins can manage pending comments"
ON public.pending_comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for efficient querying
CREATE INDEX idx_pending_comments_scheduled ON public.pending_comments(scheduled_for);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cron job to process pending comments every hour
SELECT cron.schedule(
  'process-pending-comments-hourly',
  '0 * * * *', -- Run at the start of every hour
  $$
  SELECT
    net.http_post(
      url:='https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/process-pending-comments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibXRudnh5d3BsZ3BsZG1seWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjYwOTMsImV4cCI6MjA3NzA0MjA5M30.Xt29HhlYkz3BJW9VlMBzNF-_hqmfiqOLF8HmonOxfvg"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);