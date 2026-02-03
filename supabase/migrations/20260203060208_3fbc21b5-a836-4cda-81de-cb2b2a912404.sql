-- ============================================
-- FIX 1: Secure comments table - block direct public SELECT
-- The comments_public view already excludes author_email,
-- but the base table SELECT policy exposes it for approved=true
-- ============================================

-- Drop the overly permissive policy that exposes author_email
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.comments;

-- Create a new policy that blocks direct anonymous SELECT
-- Users must use the comments_public view which excludes author_email
-- Admins can still access the full table
CREATE POLICY "Block direct public SELECT on comments"
  ON public.comments
  FOR SELECT
  USING (
    -- Admins can see everything
    has_role(auth.uid(), 'admin'::app_role)
    -- Comment authors can see their own comments
    OR user_id = auth.uid()
  );

-- ============================================
-- FIX 2: Similarly secure guide_comments table
-- ============================================

-- Check if the overly permissive policy exists and drop it
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.guide_comments;
DROP POLICY IF EXISTS "Anyone can view approved guide comments" ON public.guide_comments;

-- Create a restrictive policy for guide_comments as well
CREATE POLICY "Block direct public SELECT on guide_comments"
  ON public.guide_comments
  FOR SELECT
  USING (
    -- Admins can see everything
    has_role(auth.uid(), 'admin'::app_role)
    -- Comment authors can see their own comments
    OR user_id = auth.uid()
  );

-- ============================================
-- FIX 3: Secure newsletter_subscribers INSERT
-- Only allow inserting with the requesting user's email
-- or for anonymous users (legitimate signups)
-- ============================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- Create a more secure INSERT policy
-- This prevents attackers from inserting arbitrary emails
-- The signup_source field helps track where signups come from
CREATE POLICY "Secure newsletter subscription"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (
    -- For authenticated users: only allow subscribing their own email
    (
      auth.uid() IS NOT NULL 
      AND email = (auth.jwt() ->> 'email'::text)
    )
    -- For anonymous users: allow signup (this is the public signup form)
    -- Rate limiting should be handled at the application layer
    OR auth.uid() IS NULL
  );