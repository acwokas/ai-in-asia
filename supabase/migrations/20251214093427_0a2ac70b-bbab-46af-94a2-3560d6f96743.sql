-- Add source tracking column to newsletter_subscribers
ALTER TABLE public.newsletter_subscribers 
ADD COLUMN IF NOT EXISTS signup_source text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.newsletter_subscribers.signup_source IS 'Tracks where the signup came from: inline_article, floating_popup, welcome_popup, end_of_content, sticky_bar, footer, etc.';