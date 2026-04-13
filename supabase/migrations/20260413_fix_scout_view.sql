-- Replace scout-view CSS class with editorial-view in article content
UPDATE articles 
SET content = REPLACE(content::text, 'scout-view', 'editorial-view')::jsonb 
WHERE content::text LIKE '%scout-view%';

-- Replace Scout View heading with The AI in Asia View
UPDATE articles 
SET content = REPLACE(content::text, 'Scout View', 'The AI in Asia View')::jsonb 
WHERE content::text LIKE '%Scout View%';
