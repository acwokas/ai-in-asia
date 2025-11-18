-- Create a function to notify search engines when articles are published or updated
CREATE OR REPLACE FUNCTION notify_search_engines_on_publish()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically notify search engines
DROP TRIGGER IF EXISTS trigger_notify_search_engines ON articles;
CREATE TRIGGER trigger_notify_search_engines
  AFTER INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION notify_search_engines_on_publish();