-- Enable realtime for bulk_operation_queue table
ALTER TABLE bulk_operation_queue REPLICA IDENTITY FULL;