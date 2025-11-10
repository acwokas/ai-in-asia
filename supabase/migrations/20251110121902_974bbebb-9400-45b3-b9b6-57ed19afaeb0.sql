-- Create table to store bulk link operation history for undo functionality
CREATE TABLE IF NOT EXISTS public.bulk_link_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  articles_modified INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  backup_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  undone_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.bulk_link_operations ENABLE ROW LEVEL SECURITY;

-- Admins can manage bulk link operations
CREATE POLICY "Admins can manage bulk link operations"
  ON public.bulk_link_operations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bulk_link_operations_created_at ON public.bulk_link_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_link_operations_undone ON public.bulk_link_operations(undone_at) WHERE undone_at IS NULL;