import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  article_id: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { article_ids, batch_id } = await req.json();
    
    if (!article_ids || !Array.isArray(article_ids) || article_ids.length === 0) {
      throw new Error('article_ids must be a non-empty array');
    }

    console.log(`Starting enrichment for ${article_ids.length} articles, batch: ${batch_id}`);
 
    const results: EnrichmentResult[] = [];
    let processedCount = 0;
    let successCount = 0;
    let failCount = 0;
 
    // Mark queue as processing if batch_id is provided
    if (batch_id) {
      await supabase
        .from('enrichment_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          total_items: article_ids.length,
        })
        .eq('batch_id', batch_id);
    }
    const CHUNK_SIZE = 5;
    for (let i = 0; i < article_ids.length; i += CHUNK_SIZE) {
      const chunk = article_ids.slice(i, i + CHUNK_SIZE);
      
      for (const articleId of chunk) {
        try {
          // Fetch article details
          const { data: article, error: fetchError } = await supabase
            .from('articles')
            .select('id, title, slug, content, excerpt, primary_category_id')
            .eq('id', articleId)
            .single();

          if (fetchError || !article) {
            throw new Error(`Failed to fetch article: ${fetchError?.message}`);
          }

          console.log(`Processing article: ${article.title}`);

          // Extract text content from JSON content
          const textContent = extractTextFromContent(article.content);
          const fullText = `${article.title}\n\n${article.excerpt || ''}\n\n${textContent}`.trim();

          // Call Lovable AI for enrichment
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `You are an AI content analyst. Extract structured metadata from articles about AI in Asia.
Extract:
1. entities: Array of objects with {name: string, type: 'company'|'person'|'law'|'region'|'product'|'concept'}
2. keyphrases: Array of 5-10 important keywords/phrases
3. topics: Array of 1-3 high-level topic labels (e.g., "AI Regulation", "Enterprise AI", "AI Research")
4. summary: A 2-3 sentence internal summary (for metadata only, never published)

Return ONLY valid JSON with these exact keys: entities, keyphrases, topics, summary.`
                },
                {
                  role: 'user',
                  content: fullText.substring(0, 8000) // Limit to avoid token limits
                }
              ],
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          // Handle different possible content formats from the AI API
          const rawContent = aiData.choices?.[0]?.message?.content;
          let aiContent: string;

          if (typeof rawContent === 'string') {
            aiContent = rawContent;
          } else if (Array.isArray(rawContent)) {
            // Some providers return an array of content parts
            aiContent = rawContent
              .map((part: any) => {
                if (!part) return '';
                if (typeof part === 'string') return part;
                if (part.type === 'text' && typeof part.text?.value === 'string') return part.text.value;
                if (typeof part.text === 'string') return part.text;
                return '';
              })
              .join('\n');
          } else if (rawContent && typeof rawContent === 'object') {
            // Fallback: stringify object content
            aiContent = JSON.stringify(rawContent);
          } else {
            aiContent = '';
          }
          
          // Parse AI response with robust error handling
          let enrichmentData;
          try {
            let jsonText = aiContent.trim();
            
            // Remove markdown code blocks
            if (jsonText.includes('```')) {
              const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
              if (match) {
                jsonText = match[1].trim();
              }
            }
            
            // Find JSON object boundaries more reliably
            const startIdx = jsonText.indexOf('{');
            const endIdx = jsonText.lastIndexOf('}');
            
            if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
              throw new Error('No valid JSON object found in response');
            }
            
            // Extract only the JSON portion
            jsonText = jsonText.substring(startIdx, endIdx + 1);
            
            // Try to parse
            enrichmentData = JSON.parse(jsonText);
            
            // Validate required fields
            if (!enrichmentData || typeof enrichmentData !== 'object') {
              throw new Error('Response is not a valid object');
            }
            if (!Array.isArray(enrichmentData.entities)) {
              throw new Error('Missing or invalid entities array');
            }
            if (!Array.isArray(enrichmentData.keyphrases)) {
              throw new Error('Missing or invalid keyphrases array');
            }
            if (!Array.isArray(enrichmentData.topics)) {
              throw new Error('Missing or invalid topics array');
            }
            if (!enrichmentData.summary || typeof enrichmentData.summary !== 'string') {
              throw new Error('Missing or invalid summary string');
            }
            
          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError instanceof Error ? parseError.message : 'Unknown error');
            console.error('Raw content sample:', aiContent.substring(0, 500));
            throw new Error(`Invalid AI response format: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`);
          }

          // Note: Embedding generation is disabled as the embeddings endpoint is not available
          // Future enhancement: re-enable when embeddings API becomes available
          let embedding = null;
          console.log('Skipping embedding generation (not available)');

          // Find related articles using simple keyword matching (will be enhanced with vector search later)
          const { data: relatedArticles } = await supabase
            .from('articles')
            .select('id')
            .neq('id', articleId)
            .eq('status', 'published')
            .limit(10);

          const relatedIds = relatedArticles?.slice(0, 8).map(a => a.id) || [];

          // Store enrichment data
          const { error: upsertError } = await supabase
            .from('articles_enriched')
            .upsert({
              article_id: articleId,
              title: article.title,
              original_url: `/article/${article.slug}`,
              summary: enrichmentData.summary || '',
              embedding_vector: embedding,
              entities: enrichmentData.entities || [],
              keyphrases: enrichmentData.keyphrases || [],
              topics: enrichmentData.topics || [],
              related_articles: relatedIds,
              metadata_timestamp: new Date().toISOString(),
            }, {
              onConflict: 'article_id'
            });

          if (upsertError) {
            throw new Error(`Failed to save enrichment: ${upsertError.message}`);
          }

          // Update entities table
          for (const entity of enrichmentData.entities || []) {
            await supabase
              .from('entities')
              .upsert({
                entity_name: entity.name,
                entity_type: entity.type,
                entity_slug: slugify(entity.name),
                related_articles: [articleId], // Will be properly merged in future updates
                mention_count: 1,
              }, {
                onConflict: 'entity_name,entity_type',
                ignoreDuplicates: false,
              });
          }

          // Update topics table
          for (const topic of enrichmentData.topics || []) {
            await supabase
              .from('topics')
              .upsert({
                topic_name: topic,
                topic_slug: slugify(topic),
                article_ids: [articleId],
                article_count: 1,
              }, {
                onConflict: 'topic_name',
                ignoreDuplicates: false,
              });
          }

          results.push({ article_id: articleId, success: true });
          processedCount += 1;
          successCount += 1;
          console.log(`✓ Enriched: ${article.title}`);

          // Incremental queue progress update
          if (batch_id) {
            await supabase
              .from('enrichment_queue')
              .update({
                processed_items: processedCount,
                successful_items: successCount,
                failed_items: failCount,
              })
              .eq('batch_id', batch_id);
          }

        } catch (error) {
          console.error(`Failed to enrich article ${articleId}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ 
            article_id: articleId, 
            success: false, 
            error: errorMessage
          });
          processedCount += 1;
          failCount += 1;

          // Incremental queue progress update on failure
          if (batch_id) {
            await supabase
              .from('enrichment_queue')
              .update({
                processed_items: processedCount,
                successful_items: successCount,
                failed_items: failCount,
                error_message: errorMessage,
              })
              .eq('batch_id', batch_id);
          }
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Recalculate counts from results to ensure consistency
    successCount = results.filter(r => r.success).length;
    failCount = results.filter(r => !r.success).length;
 
    console.log(`Batch complete: ${successCount} succeeded, ${failCount} failed`);
 
    // Mark queue as completed if batch_id is provided
    if (batch_id) {
      await supabase
        .from('enrichment_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_items: results.length,
          successful_items: successCount,
          failed_items: failCount,
          results,
        })
        .eq('batch_id', batch_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function extractTextFromContent(content: any): string {
  if (!content) return '';
  
  try {
    const contentArray = Array.isArray(content) ? content : [content];
    return contentArray
      .map((block: any) => {
        if (block.type === 'paragraph' && block.content) {
          return block.content.map((item: any) => item.text || '').join(' ');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}