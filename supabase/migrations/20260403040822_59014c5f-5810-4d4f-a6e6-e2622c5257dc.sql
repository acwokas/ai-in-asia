CREATE POLICY "Allow authenticated newsletter signup"
ON public.newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated briefing signup"
ON public.briefing_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (true);