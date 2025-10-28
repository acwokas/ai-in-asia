-- Fix PromptandGo logo URL to use public path
UPDATE category_sponsors 
SET sponsor_logo_url = '/logos/promptandgo-logo.png'
WHERE sponsor_name = 'Prompt and Go';