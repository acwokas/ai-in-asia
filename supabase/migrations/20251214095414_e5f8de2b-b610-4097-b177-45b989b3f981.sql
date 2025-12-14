-- Fix RLS policies for analytics_pageviews - allow public inserts
DROP POLICY IF EXISTS "Allow public insert on analytics_pageviews" ON public.analytics_pageviews;

CREATE POLICY "Allow public insert on analytics_pageviews" 
ON public.analytics_pageviews 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also ensure analytics_events has proper insert policy
DROP POLICY IF EXISTS "Allow public insert on analytics_events" ON public.analytics_events;

CREATE POLICY "Allow public insert on analytics_events" 
ON public.analytics_events 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);