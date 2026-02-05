-- Create helper function to increment variant-specific opens
CREATE OR REPLACE FUNCTION public.increment_variant_opens(edition_uuid UUID, variant_letter TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF variant_letter = 'A' THEN
    UPDATE newsletter_editions
    SET variant_a_opened = COALESCE(variant_a_opened, 0) + 1
    WHERE id = edition_uuid;
  ELSIF variant_letter = 'B' THEN
    UPDATE newsletter_editions
    SET variant_b_opened = COALESCE(variant_b_opened, 0) + 1
    WHERE id = edition_uuid;
  END IF;
END;
$$;