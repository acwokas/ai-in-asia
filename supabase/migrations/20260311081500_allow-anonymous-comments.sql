-- Allow anonymous (non-authenticated) users to submit comments
-- This fixes the "Failed to submit comment" error for non-signed-in users
CREATE POLICY "Anonymous users can create comments"
ON public.comments
FOR INSERT
TO anon
WITH CHECK (true);
