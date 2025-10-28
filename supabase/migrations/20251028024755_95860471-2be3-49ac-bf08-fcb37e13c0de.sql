-- Create scout_queries table for tracking daily query limits
CREATE TABLE IF NOT EXISTS public.scout_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  query_date DATE NOT NULL DEFAULT CURRENT_DATE,
  query_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, query_date)
);

-- Enable Row Level Security
ALTER TABLE public.scout_queries ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own query counts
CREATE POLICY "Users can view their own query counts"
ON public.scout_queries
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to insert their own query records
CREATE POLICY "Users can insert their own query records"
ON public.scout_queries
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own query counts
CREATE POLICY "Users can update their own query counts"
ON public.scout_queries
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scout_queries_user_date 
ON public.scout_queries(user_id, query_date);