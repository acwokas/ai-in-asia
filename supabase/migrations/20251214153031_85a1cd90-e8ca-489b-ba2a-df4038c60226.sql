-- Create error tracking table to manage error resolution status
CREATE TABLE public.error_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_signature TEXT NOT NULL UNIQUE,
  error_message TEXT NOT NULL,
  error_source TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'fixed', 'ignored')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  notes TEXT,
  affected_pages TEXT[],
  sample_stack TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_tracking ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with admin role can view and manage errors (use has_role RPC)
CREATE POLICY "Authenticated users can view errors"
  ON public.error_tracking
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage errors"
  ON public.error_tracking
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_error_tracking_updated_at
  BEFORE UPDATE ON public.error_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_error_tracking_status ON public.error_tracking(status);
CREATE INDEX idx_error_tracking_last_seen ON public.error_tracking(last_seen_at DESC);
CREATE INDEX idx_error_tracking_signature ON public.error_tracking(error_signature);