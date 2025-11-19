-- Fix security warning: Set search_path for functions using CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_enrichment_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;