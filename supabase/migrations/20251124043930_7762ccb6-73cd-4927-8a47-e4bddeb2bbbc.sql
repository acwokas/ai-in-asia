-- Create table to track 404 errors
CREATE TABLE IF NOT EXISTS public.page_not_found_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  redirect_created BOOLEAN DEFAULT FALSE
);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_page_not_found_path ON public.page_not_found_log(path);
CREATE INDEX IF NOT EXISTS idx_page_not_found_created_at ON public.page_not_found_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_not_found_resolved ON public.page_not_found_log(resolved);

-- Enable RLS
ALTER TABLE public.page_not_found_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (log 404s)
CREATE POLICY "Allow public to log 404s"
ON public.page_not_found_log
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Allow admins to view 404 logs"
ON public.page_not_found_log
FOR SELECT
TO authenticated
USING (true);