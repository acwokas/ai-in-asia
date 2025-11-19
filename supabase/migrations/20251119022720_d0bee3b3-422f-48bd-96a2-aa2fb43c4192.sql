-- Enable realtime for enrichment_queue table
ALTER TABLE public.enrichment_queue REPLICA IDENTITY FULL;

-- Add enrichment_queue to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrichment_queue;