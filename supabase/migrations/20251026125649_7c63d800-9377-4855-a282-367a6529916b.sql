-- ============================================
-- STEP 1: CREATE ENUMS
-- ============================================

CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE article_type_new AS ENUM ('article', 'news', 'review', 'guide', 'podcast', 'video', 'event');
CREATE TYPE newsletter_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');
CREATE TYPE tool_prompt_category AS ENUM ('tool', 'prompt');
CREATE TYPE app_role AS ENUM ('admin', 'editor', 'contributor', 'user');