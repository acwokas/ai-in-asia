-- Add columns to track A/B test phase and results
ALTER TABLE public.newsletter_editions
ADD COLUMN IF NOT EXISTS ab_test_phase text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS variant_a_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_b_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_a_opened integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_b_opened integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS winning_variant text,
ADD COLUMN IF NOT EXISTS ab_test_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS ab_test_completed_at timestamptz;

-- Add variant tracking to newsletter_sends
ALTER TABLE public.newsletter_sends
ADD COLUMN IF NOT EXISTS variant text;

COMMENT ON COLUMN public.newsletter_editions.ab_test_phase IS 'pending, testing, completed';
COMMENT ON COLUMN public.newsletter_editions.winning_variant IS 'A or B based on open rates';