-- Create bulk operation queue table
CREATE TABLE IF NOT EXISTS public.bulk_operation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  operation_type TEXT NOT NULL CHECK (operation_type IN ('add_internal_links', 'update_seo', 'other')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Job parameters
  article_ids JSONB NOT NULL,
  options JSONB DEFAULT '{}'::jsonb,
  
  -- Progress tracking
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  successful_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  
  -- Results
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create index for efficient queries
CREATE INDEX idx_bulk_operation_queue_status ON public.bulk_operation_queue(status);
CREATE INDEX idx_bulk_operation_queue_created_by ON public.bulk_operation_queue(created_by);
CREATE INDEX idx_bulk_operation_queue_created_at ON public.bulk_operation_queue(created_at DESC);

-- Enable RLS
ALTER TABLE public.bulk_operation_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own queue items"
  ON public.bulk_operation_queue
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create queue items"
  ON public.bulk_operation_queue
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own queue items"
  ON public.bulk_operation_queue
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all queue items"
  ON public.bulk_operation_queue
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_bulk_operation_queue_updated_at
  BEFORE UPDATE ON public.bulk_operation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for queue updates
ALTER TABLE public.bulk_operation_queue REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_operation_queue;
