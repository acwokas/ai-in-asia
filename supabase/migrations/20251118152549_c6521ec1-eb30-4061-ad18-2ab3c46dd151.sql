-- Fix security issue: Set search path for the notify function
CREATE OR REPLACE FUNCTION notify_search_engines_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  supabase_url text := current_setting('app.settings.supabase_url', true);
  supabase_anon_key text := current_setting('app.settings.supabase_anon_key', true);
BEGIN
  -- Only trigger for published articles
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'published')) THEN
    -- Call the edge function asynchronously using pg_net (if available)
    -- This is a fire-and-forget operation
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-search-engines',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := jsonb_build_object(
        'articleId', NEW.id::text,
        'action', 'updated'
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to notify search engines: %', SQLERRM;
    RETURN NEW;
END;
$$;