-- ============================================
-- STEP 10: CREATE ALL TRIGGERS
-- ============================================

-- Timestamp Triggers
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON public.authors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_article_series_updated_at BEFORE UPDATE ON public.article_series FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_newsletter_editions_updated_at BEFORE UPDATE ON public.newsletter_editions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_newsletter_sponsors_updated_at BEFORE UPDATE ON public.newsletter_sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_newsletter_tools_prompts_updated_at BEFORE UPDATE ON public.newsletter_tools_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_redirects_updated_at BEFORE UPDATE ON public.redirects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_editors_picks_updated_at BEFORE UPDATE ON public.editors_picks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Article Triggers
CREATE TRIGGER set_article_published_at BEFORE INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_published_at();
CREATE TRIGGER update_author_article_count_trigger AFTER INSERT OR UPDATE OR DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_author_article_count();

-- User Triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin();

-- Gamification Triggers
CREATE TRIGGER handle_reading_points_trigger AFTER INSERT ON public.reading_history FOR EACH ROW EXECUTE FUNCTION public.handle_reading_points();
CREATE TRIGGER handle_bookmark_points_trigger AFTER INSERT ON public.bookmarks FOR EACH ROW EXECUTE FUNCTION public.handle_bookmark_points();
CREATE TRIGGER handle_comment_points_trigger AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_comment_points();

-- ============================================
-- STEP 11: CREATE STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('article-images', 'article-images', true);

CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'article-images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'article-images' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));