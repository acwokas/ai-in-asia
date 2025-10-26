-- Fix security definer view issue by recreating with security_invoker
DROP VIEW IF EXISTS public.authors_public CASCADE;

CREATE OR REPLACE VIEW public.authors_public 
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  slug,
  avatar_url,
  bio,
  job_title,
  twitter_handle,
  article_count,
  is_featured,
  created_at,
  updated_at
FROM public.authors;