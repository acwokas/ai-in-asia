-- Add 'top_lists' to the article_type_new enum
ALTER TYPE article_type_new ADD VALUE IF NOT EXISTS 'top_lists';

-- Add a new column to store top list items
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS top_list_items JSONB DEFAULT '[]'::jsonb;