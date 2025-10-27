-- Allow anyone (including unauthenticated users) to subscribe to the newsletter
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (true);