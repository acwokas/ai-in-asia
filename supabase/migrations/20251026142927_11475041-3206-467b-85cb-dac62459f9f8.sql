-- Add RLS policies for all tables

-- Categories: Public read, admin write
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tags: Public read, admin write
CREATE POLICY "Anyone can view tags"
ON public.tags
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tags"
ON public.tags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Article Categories: Public read, admin write
CREATE POLICY "Anyone can view article categories"
ON public.article_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage article categories"
ON public.article_categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Article Tags: Public read, admin write
CREATE POLICY "Anyone can view article tags"
ON public.article_tags
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage article tags"
ON public.article_tags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authors: Public read, admin write
CREATE POLICY "Anyone can view authors"
ON public.authors
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage authors"
ON public.authors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Article Series: Public read, admin write
CREATE POLICY "Anyone can view article series"
ON public.article_series
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage article series"
ON public.article_series
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Comments: Public read approved, authenticated write, admin manage
CREATE POLICY "Anyone can view approved comments"
ON public.comments
FOR SELECT
USING (approved = true);

CREATE POLICY "Authenticated users can create comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all comments"
ON public.comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bookmarks: User-specific
CREATE POLICY "Users can view their own bookmarks"
ON public.bookmarks
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own bookmarks"
ON public.bookmarks
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own bookmarks"
ON public.bookmarks
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Reading History: User-specific
CREATE POLICY "Users can view their own reading history"
ON public.reading_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own reading history"
ON public.reading_history
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reading history"
ON public.reading_history
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Profiles: User-specific read/write, public basic info
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- User Stats: User-specific read, system write
CREATE POLICY "Users can view their own stats"
ON public.user_stats
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Achievements: Public read
CREATE POLICY "Anyone can view achievements"
ON public.achievements
FOR SELECT
USING (true);

-- User Achievements: User-specific
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Editors Picks: Public read, admin write
CREATE POLICY "Anyone can view editors picks"
ON public.editors_picks
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage editors picks"
ON public.editors_picks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Events: Public read, admin write
CREATE POLICY "Anyone can view events"
ON public.events
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage events"
ON public.events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Redirects: Admin only
CREATE POLICY "Admins can manage redirects"
ON public.redirects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- URL Mappings: Admin only
CREATE POLICY "Admins can manage url mappings"
ON public.url_mappings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Migration Logs: Admin only
CREATE POLICY "Admins can manage migration logs"
ON public.migration_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Contact Messages: Admin read, anyone create
CREATE POLICY "Anyone can create contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Article Recommendations: User-specific
CREATE POLICY "Users can view their own recommendations"
ON public.article_recommendations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Newsletter Editions: Public read published, admin manage
CREATE POLICY "Anyone can view sent newsletter editions"
ON public.newsletter_editions
FOR SELECT
USING (status = 'sent');

CREATE POLICY "Admins can manage newsletter editions"
ON public.newsletter_editions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Subscribers: Self-manage, admin view
CREATE POLICY "Users can manage their own subscription"
ON public.newsletter_subscribers
FOR ALL
USING (email = auth.jwt() ->> 'email')
WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "Admins can view all subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter Quick Takes: Public read, admin write
CREATE POLICY "Anyone can view newsletter quick takes"
ON public.newsletter_quick_takes
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage newsletter quick takes"
ON public.newsletter_quick_takes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Top Stories: Public read, admin write
CREATE POLICY "Anyone can view newsletter top stories"
ON public.newsletter_top_stories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage newsletter top stories"
ON public.newsletter_top_stories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Sponsors: Public read, admin write
CREATE POLICY "Anyone can view active newsletter sponsors"
ON public.newsletter_sponsors
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage newsletter sponsors"
ON public.newsletter_sponsors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Tools Prompts: Public read, admin write
CREATE POLICY "Anyone can view active newsletter tools prompts"
ON public.newsletter_tools_prompts
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage newsletter tools prompts"
ON public.newsletter_tools_prompts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Mystery Links: Public read active, admin write
CREATE POLICY "Anyone can view active newsletter mystery links"
ON public.newsletter_mystery_links
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage newsletter mystery links"
ON public.newsletter_mystery_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Fun Facts: Public read active, admin write
CREATE POLICY "Anyone can view active newsletter fun facts"
ON public.newsletter_fun_facts
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage newsletter fun facts"
ON public.newsletter_fun_facts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter News Sources: Admin only
CREATE POLICY "Admins can manage newsletter news sources"
ON public.newsletter_news_sources
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Newsletter Sends: Admin read
CREATE POLICY "Admins can view newsletter sends"
ON public.newsletter_sends
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter Automation Log: Admin only
CREATE POLICY "Admins can view newsletter automation log"
ON public.newsletter_automation_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Popup Settings: Admin only
CREATE POLICY "Admins can manage popup settings"
ON public.popup_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Scout Queries: Admin view, user track own
CREATE POLICY "Users can create scout queries"
ON public.scout_queries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all scout queries"
ON public.scout_queries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Site Settings: Public read, admin write
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));