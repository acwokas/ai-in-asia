-- Fix stock_prices trigger - it should update last_updated, not updated_at
DROP TRIGGER IF EXISTS update_stock_prices_updated_at ON stock_prices;

CREATE OR REPLACE FUNCTION public.update_stock_prices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_stock_prices_last_updated
  BEFORE UPDATE ON public.stock_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_prices_timestamp();

-- Allow system to insert article recommendations
CREATE POLICY "System can insert article recommendations"
ON public.article_recommendations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow system to insert user achievements
CREATE POLICY "System can insert user achievements"
ON public.user_achievements
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow system to insert pending comments
CREATE POLICY "System can insert pending comments"
ON public.pending_comments
FOR INSERT
TO authenticated
WITH CHECK (true);