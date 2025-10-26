-- Create stock_prices table for caching stock data
CREATE TABLE public.stock_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  current_price NUMERIC(10,2) NOT NULL,
  change_amount NUMERIC(10,2) NOT NULL,
  change_percent NUMERIC(5,2) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_prices ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Stock prices viewable by everyone" 
  ON public.stock_prices FOR SELECT 
  USING (true);

-- System can insert/update stock prices
CREATE POLICY "System can manage stock prices" 
  ON public.stock_prices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update stock prices" 
  ON public.stock_prices FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_stock_prices_symbol ON public.stock_prices(symbol);
CREATE INDEX idx_stock_prices_updated ON public.stock_prices(last_updated);

-- Add trigger to update last_updated
CREATE TRIGGER update_stock_prices_updated_at
  BEFORE UPDATE ON public.stock_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
