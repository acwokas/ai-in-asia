-- Add 'scheduled' to article_status enum
ALTER TYPE article_status ADD VALUE IF NOT EXISTS 'scheduled';