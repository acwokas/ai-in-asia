-- Ensure article_categories has proper unique constraint
ALTER TABLE article_categories DROP CONSTRAINT IF EXISTS article_categories_pkey;
ALTER TABLE article_categories DROP CONSTRAINT IF EXISTS article_categories_article_id_category_id_key;
ALTER TABLE article_categories ADD CONSTRAINT article_categories_pkey PRIMARY KEY (article_id, category_id);