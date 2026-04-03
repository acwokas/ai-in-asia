CREATE POLICY "Allow anonymous newsletter signup"
ON public.newsletter_subscribers
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous briefing signup"
ON public.briefing_subscriptions
FOR INSERT
TO anon
WITH CHECK (true);