-- Create ai_tools table
CREATE TABLE IF NOT EXISTS public.ai_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  logo_url TEXT,
  category TEXT,
  source_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  rating_avg NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, url)
);

-- Create tool_ratings table
CREATE TABLE IF NOT EXISTS public.tool_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.ai_tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tool_id, user_id)
);

-- Enable RLS
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_tools
CREATE POLICY "Anyone can view ai tools"
  ON public.ai_tools FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage ai tools"
  ON public.ai_tools FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for tool_ratings
CREATE POLICY "Anyone can view tool ratings"
  ON public.tool_ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create ratings"
  ON public.tool_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.tool_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update tool rating averages
CREATE OR REPLACE FUNCTION public.update_tool_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_tools
  SET 
    rating_avg = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.tool_ratings
      WHERE tool_id = COALESCE(NEW.tool_id, OLD.tool_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.tool_ratings
      WHERE tool_id = COALESCE(NEW.tool_id, OLD.tool_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.tool_id, OLD.tool_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_tool_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tool_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_tool_rating();

-- Trigger to award points for rating tools
CREATE OR REPLACE FUNCTION public.handle_tool_rating_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(NEW.user_id, 5);
    PERFORM public.check_and_award_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tool_rating_points_trigger
AFTER INSERT ON public.tool_ratings
FOR EACH ROW
EXECUTE FUNCTION public.handle_tool_rating_points();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tool_ratings_tool_id ON public.tool_ratings(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_ratings_user_id ON public.tool_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_name ON public.ai_tools(name);
CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON public.ai_tools(category);