-- Fix: The article-specific update_updated_at_column function references
-- article-only fields (title, slug, content, etc.) but was attached to other tables.
-- Replace with the simple update_updated_at function.

DROP TRIGGER IF EXISTS update_authors_updated_at ON public.authors;
CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON public.authors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_article_series_updated_at ON public.article_series;
CREATE TRIGGER update_article_series_updated_at BEFORE UPDATE ON public.article_series FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_category_sponsors_updated_at ON public.category_sponsors;
CREATE TRIGGER update_category_sponsors_updated_at BEFORE UPDATE ON public.category_sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_bulk_operation_queue_updated_at ON public.bulk_operation_queue;
CREATE TRIGGER update_bulk_operation_queue_updated_at BEFORE UPDATE ON public.bulk_operation_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_ai_guides_updated_at ON public.ai_guides;
CREATE TRIGGER update_ai_guides_updated_at BEFORE UPDATE ON public.ai_guides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_error_tracking_updated_at ON public.error_tracking;
CREATE TRIGGER update_error_tracking_updated_at BEFORE UPDATE ON public.error_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_platform_accounts_updated_at ON public.platform_accounts;
CREATE TRIGGER update_platform_accounts_updated_at BEFORE UPDATE ON public.platform_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Also drop the orphaned trigger on the non-existent objects table (safe no-op)
-- DROP TRIGGER IF EXISTS update_objects_updated_at ON public.objects; -- table doesn't exist