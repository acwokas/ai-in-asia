-- Drop the existing check constraint
ALTER TABLE bulk_operation_queue 
DROP CONSTRAINT IF EXISTS bulk_operation_queue_operation_type_check;

-- Add updated check constraint with generate_ai_comments
ALTER TABLE bulk_operation_queue
ADD CONSTRAINT bulk_operation_queue_operation_type_check 
CHECK (operation_type IN ('add_internal_links', 'generate_seo', 'generate_ai_comments'));