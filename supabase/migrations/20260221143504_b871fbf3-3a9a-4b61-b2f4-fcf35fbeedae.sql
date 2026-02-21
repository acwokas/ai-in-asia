
-- Core new fields
ALTER TABLE public.ai_guides
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS pillar text,
ADD COLUMN IF NOT EXISTS content_type text,
ADD COLUMN IF NOT EXISTS difficulty text,
ADD COLUMN IF NOT EXISTS platform_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topic_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS one_line_description text,
ADD COLUMN IF NOT EXISTS read_time_minutes integer,
ADD COLUMN IF NOT EXISTS featured_image_url text,
ADD COLUMN IF NOT EXISTS featured_image_alt text,
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id);

-- Structured content fields (JSONB for flexibility)
ALTER TABLE public.ai_guides
ADD COLUMN IF NOT EXISTS snapshot_bullets text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS why_this_matters text,
ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS worked_example jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS guide_prompts jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS common_mistakes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended_tools jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS faq_items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS next_steps text;

-- Publishing & display
ALTER TABLE public.ai_guides
ADD COLUMN IF NOT EXISTS is_editors_pick boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_in_learning_paths boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone,
ADD COLUMN IF NOT EXISTS preview_code text DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create validation trigger for status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_guide_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft, published, or archived.', NEW.status;
  END IF;
  IF NEW.pillar IS NOT NULL AND NEW.pillar NOT IN ('learn', 'prompts', 'toolbox') THEN
    RAISE EXCEPTION 'Invalid pillar: %. Must be learn, prompts, or toolbox.', NEW.pillar;
  END IF;
  IF NEW.difficulty IS NOT NULL AND NEW.difficulty NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid difficulty: %. Must be beginner, intermediate, or advanced.', NEW.difficulty;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_guide_fields
BEFORE INSERT OR UPDATE ON public.ai_guides
FOR EACH ROW
EXECUTE FUNCTION public.validate_guide_status();

-- Auto-set published_at when status changes to published
CREATE OR REPLACE FUNCTION public.set_guide_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_guide_published_at_trigger
BEFORE INSERT OR UPDATE ON public.ai_guides
FOR EACH ROW
EXECUTE FUNCTION public.set_guide_published_at();
