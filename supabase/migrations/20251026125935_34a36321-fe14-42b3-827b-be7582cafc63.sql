-- ============================================
-- STEP 8: CREATE VIEWS
-- ============================================

-- Authors Public View (limited fields)
CREATE OR REPLACE VIEW public.authors_public AS
SELECT 
  id,
  name,
  slug,
  bio,
  avatar_url,
  job_title,
  twitter_handle,
  article_count,
  created_at,
  updated_at
FROM public.authors;

-- ============================================
-- STEP 9: CREATE DATABASE FUNCTIONS (Part 1)
-- ============================================

-- Update Updated At Timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alternative timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Set Published At Timestamp
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Update Author Article Count
CREATE OR REPLACE FUNCTION public.update_author_article_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or status change to published
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'published' AND OLD.status != 'published') THEN
    IF NEW.author_id IS NOT NULL THEN
      UPDATE public.authors 
      SET article_count = article_count + 1 
      WHERE id = NEW.author_id;
    END IF;
  END IF;

  -- Status change from published
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status != 'published' THEN
    IF OLD.author_id IS NOT NULL THEN
      UPDATE public.authors 
      SET article_count = GREATEST(article_count - 1, 0)
      WHERE id = OLD.author_id;
    END IF;
  END IF;

  -- Delete published article
  IF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    IF OLD.author_id IS NOT NULL THEN
      UPDATE public.authors 
      SET article_count = GREATEST(article_count - 1, 0)
      WHERE id = OLD.author_id;
    END IF;
  END IF;

  -- Author change while published
  IF TG_OP = 'UPDATE' AND NEW.status = 'published' AND OLD.status = 'published' AND 
     OLD.author_id IS DISTINCT FROM NEW.author_id THEN
    IF OLD.author_id IS NOT NULL THEN
      UPDATE public.authors 
      SET article_count = GREATEST(article_count - 1, 0)
      WHERE id = OLD.author_id;
    END IF;
    IF NEW.author_id IS NOT NULL THEN
      UPDATE public.authors 
      SET article_count = article_count + 1 
      WHERE id = NEW.author_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Update Trending Articles
CREATE OR REPLACE FUNCTION public.update_trending_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset all trending flags
  UPDATE articles SET is_trending = false;
  
  -- Mark top 10 articles from past 7 days as trending
  UPDATE articles
  SET is_trending = true
  WHERE id IN (
    SELECT id
    FROM articles
    WHERE status = 'published'
      AND published_at >= NOW() - INTERVAL '7 days'
    ORDER BY (view_count * 1 + like_count * 3 + comment_count * 5) DESC
    LIMIT 10
  );
END;
$$;

-- User Role Check Function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Handle New User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Grant Admin to First User
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Grant admin role to first user only
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;