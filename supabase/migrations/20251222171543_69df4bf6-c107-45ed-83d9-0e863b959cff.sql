-- Add policy status fields to articles table for Policy Atlas enhancements

-- Policy status enum
DO $$ BEGIN
  CREATE TYPE public.policy_status_type AS ENUM ('draft', 'proposed', 'enacted', 'in_force', 'under_review');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Policy applies to enum
DO $$ BEGIN
  CREATE TYPE public.policy_applies_to_type AS ENUM ('commercial_ai', 'public_sector_ai', 'both');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Policy regulatory impact enum
DO $$ BEGIN
  CREATE TYPE public.policy_regulatory_impact_type AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to articles table
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS policy_status public.policy_status_type,
  ADD COLUMN IF NOT EXISTS policy_effective_date text,
  ADD COLUMN IF NOT EXISTS policy_applies_to public.policy_applies_to_type,
  ADD COLUMN IF NOT EXISTS policy_regulatory_impact public.policy_regulatory_impact_type,
  ADD COLUMN IF NOT EXISTS last_editorial_review date;

-- Add comment explaining usage
COMMENT ON COLUMN public.articles.policy_status IS 'For policy_article type: Draft | Proposed | Enacted | In force | Under review';
COMMENT ON COLUMN public.articles.policy_effective_date IS 'Month and year, or TBC if unknown';
COMMENT ON COLUMN public.articles.policy_applies_to IS 'Commercial AI | Public sector AI | Both';
COMMENT ON COLUMN public.articles.policy_regulatory_impact IS 'Low | Medium | High';
COMMENT ON COLUMN public.articles.last_editorial_review IS 'Date of last editorial review';