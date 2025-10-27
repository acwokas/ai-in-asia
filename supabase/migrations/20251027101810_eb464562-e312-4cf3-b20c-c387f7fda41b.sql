-- Add comment_date column to pending_comments table
ALTER TABLE public.pending_comments 
ADD COLUMN IF NOT EXISTS comment_date TIMESTAMP WITH TIME ZONE;