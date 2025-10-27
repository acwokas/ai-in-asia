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
  { url: 'https://slashdot.org/software/ai-tools/in-asia/', name: 'Slashdot', maxTools: 30 },
  { url: 'https://sourceforge.net/software/ai-tools/asia/', name: 'SourceForge', maxTools: 20 }
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
          
          // Clean HTML to focus on content
          let cleanedHtml = html;
          
          // Remove scripts, styles, and navigation
          cleanedHtml = cleanedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          cleanedHtml = cleanedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          cleanedHtml = cleanedHtml.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
          cleanedHtml = cleanedHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
          cleanedHtml = cleanedHtml.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
          
          console.log(`Cleaned HTML to ${cleanedHtml.length} characters`);
          
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-pro',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert at extracting AI tool listings from web pages. 
                  
CRITICAL INSTRUCTIONS:
1. Extract ONLY tools that are CLEARLY AI tools (machine learning, neural networks, natural language processing, computer vision, etc.)
2. Look for software products, platforms, APIs, or services - NOT articles, news, or blog posts
3. Each tool MUST have a name, description, and valid URL
4. Return ONLY a JSON array - NO markdown, NO code blocks, NO explanations
5. Extract up to ${source.maxTools} tools maximum
6. For descriptions: summarize what the tool does in 1-2 sentences, focusing on AI capabilities
7. For categories: use terms like "Machine Learning", "Computer Vision", "NLP", "AI Platform", "Deep Learning", etc.

Example format:
[{"name":"TensorFlow","description":"Open-source machine learning framework for building and training neural networks.","url":"https://tensorflow.org","category":"Machine Learning"}]`
                },
                {
                  role: 'user',
                  content: `Extract AI tools from this ${source.name} page. Focus on the main content area where tools are listed. Look for tool names, descriptions, company names, and links. Ignore navigation, ads, and unrelated content.

HTML content (cleaned):
${cleanedHtml.substring(0, 120000)}`
                }
              ],
              max_tokens: 12000,
              temperature: 0.3,
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

    // Insert or update tools in database
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Sort alphabetically and take up to 50
    const toolsArray = Array.from(allTools.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);

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