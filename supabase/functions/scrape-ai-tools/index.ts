import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedTool {
  name: string;
  description: string;
  url: string;
  category?: string;
  logo_url?: string;
}

const SOURCES = [
  { url: 'https://slashdot.org/software/ai-tools/in-asia/', name: 'Slashdot' },
  { url: 'https://sourceforge.net/software/ai-tools/asia/', name: 'SourceForge' }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(supabase, authHeader);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    await requireAdmin(supabase, user.id);

    console.log('Starting AI tools scraping from multiple sources...');
    
    const allTools: Map<string, ScrapedTool & { source_urls: string[] }> = new Map();
    let successfulScrapes = 0;
    let failedScrapes = 0;

    // Scrape each source
    for (const source of SOURCES) {
      try {
        console.log(`Fetching tools from ${source.name}...`);
        
        const response = await fetch(source.url);
        if (!response.ok) {
          console.error(`Failed to fetch ${source.name}: ${response.status}`);
          failedScrapes++;
          continue;
        }

        const html = await response.text();
        console.log(`Fetched ${html.length} characters from ${source.name}`);

        // Use AI to extract tool data from HTML
        if (lovableApiKey) {
          console.log(`Calling AI to extract tools from ${source.name}...`);
          
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': lovableApiKey,
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-pro',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at extracting structured data from HTML. Your task is to find AI tools/products listed on the page and extract their information. Return ONLY a valid JSON array with NO markdown formatting, NO code blocks, NO explanations - just the raw JSON array. Each tool must have: name (string, required), description (string, required), url (string, required), category (string, optional). Example: [{"name":"Tool Name","description":"Tool description","url":"https://example.com","category":"AI"}]'
                },
                {
                  role: 'user',
                  content: `Extract ALL AI tools from this HTML page. Look for product listings, tool cards, software entries. Extract their names, descriptions, URLs, and categories if available. Return as JSON array:\n\n${html.substring(0, 100000)}`
                }
              ],
              max_tokens: 8000,
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error(`AI API error for ${source.name}: ${aiResponse.status} - ${errorText}`);
            failedScrapes++;
            continue;
          }

          const aiData = await aiResponse.json();
          console.log(`AI response for ${source.name}:`, JSON.stringify(aiData).substring(0, 500));
          
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            try {
              console.log(`Raw content from ${source.name} (first 1000 chars):`, content.substring(0, 1000));
              
              // Try to extract JSON from various formats
              let jsonStr = content.trim();
              
              // Remove markdown code blocks
              if (jsonStr.includes('```')) {
                const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch) {
                  jsonStr = codeBlockMatch[1];
                }
              }
              
              // Find JSON array in the text
              const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                jsonStr = arrayMatch[0];
              }
              
              console.log(`Attempting to parse JSON for ${source.name} (first 500 chars):`, jsonStr.substring(0, 500));
              
              const tools: ScrapedTool[] = JSON.parse(jsonStr);
              
              if (!Array.isArray(tools)) {
                console.error(`AI returned non-array for ${source.name}`);
                failedScrapes++;
                continue;
              }
              
              console.log(`Successfully extracted ${tools.length} tools from ${source.name}`);
              
              // Deduplicate by name (case insensitive) and validate
              let validCount = 0;
              tools.forEach(tool => {
                if (tool.name && tool.url && tool.description) {
                  const key = tool.name.toLowerCase().trim();
                  if (allTools.has(key)) {
                    // Add source URL to existing tool
                    const existing = allTools.get(key)!;
                    if (!existing.source_urls.includes(source.url)) {
                      existing.source_urls.push(source.url);
                    }
                  } else {
                    // Add new tool
                    allTools.set(key, {
                      ...tool,
                      source_urls: [source.url]
                    });
                    validCount++;
                  }
                } else {
                  console.log(`Skipping invalid tool:`, tool);
                }
              });
              
              console.log(`Added ${validCount} valid tools from ${source.name}`);
              successfulScrapes++;
            } catch (parseError) {
              console.error(`Failed to parse AI response for ${source.name}:`, parseError);
              console.error(`Content that failed to parse:`, content.substring(0, 2000));
              failedScrapes++;
            }
          } else {
            console.error(`No content in AI response for ${source.name}`);
            failedScrapes++;
          }
        } else {
          console.error('LOVABLE_API_KEY not configured');
          failedScrapes++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
        failedScrapes++;
      }
    }

    console.log(`Scraping complete. Total unique tools found: ${allTools.size}`);

    // Insert or update tools in database (limit to 50)
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const toolsArray = Array.from(allTools.values()).slice(0, 50);

    for (const tool of toolsArray) {
      try {
        // Check if tool exists
        const { data: existing } = await supabase
          .from('ai_tools')
          .select('id, source_urls')
          .eq('name', tool.name)
          .single();

        if (existing) {
          // Update existing tool with new source URLs
          const mergedSourceUrls = Array.from(new Set([...existing.source_urls, ...tool.source_urls]));
          
          const { error: updateError } = await supabase
            .from('ai_tools')
            .update({
              description: tool.description,
              url: tool.url,
              category: tool.category,
              logo_url: tool.logo_url,
              source_urls: mergedSourceUrls,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Error updating tool ${tool.name}:`, updateError);
            skippedCount++;
          } else {
            updatedCount++;
          }
        } else {
          // Insert new tool
          const { error: insertError } = await supabase
            .from('ai_tools')
            .insert({
              name: tool.name,
              description: tool.description,
              url: tool.url,
              category: tool.category,
              logo_url: tool.logo_url,
              source_urls: tool.source_urls
            });

          if (insertError) {
            console.error(`Error inserting tool ${tool.name}:`, insertError);
            skippedCount++;
          } else {
            insertedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing tool ${tool.name}:`, error);
        skippedCount++;
      }
    }

    console.log(`Database operations complete. Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI tools scraping completed',
        stats: {
          sources_scraped: successfulScrapes,
          sources_failed: failedScrapes,
          total_tools_found: allTools.size,
          inserted: insertedCount,
          updated: updatedCount,
          skipped: skippedCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in scrape-ai-tools function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});