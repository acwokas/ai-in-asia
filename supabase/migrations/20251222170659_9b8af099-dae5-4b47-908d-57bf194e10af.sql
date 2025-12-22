-- Allow TL;DR context backfill jobs in the bulk operation queue

ALTER TABLE public.bulk_operation_queue
  DROP CONSTRAINT IF EXISTS bulk_operation_queue_operation_type_check;

ALTER TABLE public.bulk_operation_queue
  ADD CONSTRAINT bulk_operation_queue_operation_type_check
  CHECK (
    operation_type = ANY (
      ARRAY[
        'add_internal_links'::text,
        'generate_seo'::text,
        'generate_ai_comments'::text,
        'update_seo'::text,
        'tldr_context_update'::text
      ]
    )
  );
