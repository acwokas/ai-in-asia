-- Update AI tools URLs from SourceForge to official websites
UPDATE ai_tools SET url = 'https://replicate.com/' WHERE name = 'Replicate';
UPDATE ai_tools SET url = 'https://www.anyword.com/' WHERE name = 'Anyword';
UPDATE ai_tools SET url = 'https://murf.ai/' WHERE name = 'Murf.ai';
UPDATE ai_tools SET url = 'https://www.deepl.com/' WHERE name = 'DeepL';
UPDATE ai_tools SET url = 'https://www.copy.ai/' WHERE name = 'Copy.ai';
UPDATE ai_tools SET url = 'https://www.descript.com/' WHERE name = 'Descript';
UPDATE ai_tools SET url = 'https://www.jasper.ai/' WHERE name = 'Jasper';
UPDATE ai_tools SET url = 'https://www.grammarly.com/' WHERE name = 'Grammarly';
UPDATE ai_tools SET url = 'https://www.writesonic.com/' WHERE name = 'Writesonic';
UPDATE ai_tools SET url = 'https://www.synthesia.io/' WHERE name = 'Synthesia';

-- Update any remaining sourceforge.net URLs to remove the specific product path
UPDATE ai_tools 
SET url = REPLACE(url, 'sourceforge.net/software/product/', 'sourceforge.net/projects/')
WHERE url LIKE '%sourceforge.net/software/product/%';