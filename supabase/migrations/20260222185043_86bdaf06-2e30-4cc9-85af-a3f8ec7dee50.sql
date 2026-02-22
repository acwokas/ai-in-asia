
ALTER TABLE ai_comment_authors ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE ai_comment_authors ADD COLUMN IF NOT EXISTS persona_type text;
ALTER TABLE ai_comment_authors ADD COLUMN IF NOT EXISTS commenting_style text;
