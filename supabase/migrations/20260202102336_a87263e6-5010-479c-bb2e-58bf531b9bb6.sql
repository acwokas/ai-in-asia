-- Create helper function to increment newsletter opens
CREATE OR REPLACE FUNCTION public.increment_newsletter_opens(edition_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE newsletter_editions
  SET total_opened = COALESCE(total_opened, 0) + 1
  WHERE id = edition_uuid;
END;
$$;