import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all articles
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, content, title')
      .is('reading_time_minutes', null);

    if (fetchError) throw fetchError;

    console.log(`Processing ${articles?.length || 0} articles`);

    const results = [];
    
    for (const article of articles || []) {
      try {
        const readingTime = calculateReadingTime(article.content, article.title);
        
        const { error: updateError } = await supabase
          .from('articles')
          .update({ reading_time_minutes: readingTime })
          .eq('id', article.id);

        if (updateError) {
          console.error(`Error updating article ${article.id}:`, updateError);
          results.push({ id: article.id, status: 'error', error: updateError.message });
        } else {
          results.push({ id: article.id, status: 'success', readingTime });
        }
      } catch (err) {
        const error = err as Error;
        console.error(`Error processing article ${article.id}:`, error);
        results.push({ id: article.id, status: 'error', error: error.message });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${articles?.length || 0} articles. ${successCount} successful, ${errorCount} failed.`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateReadingTime(content: any, title: string): number {
  let wordCount = 0;

  // Count words in title
  if (title) {
    wordCount += title.split(/\s+/).filter(word => word.length > 0).length;
  }

  // If content is a string (markdown), parse it
  if (typeof content === 'string') {
    // Remove markdown formatting and count words
    const plainText = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .trim();
    
    wordCount += plainText.split(/\s+/).filter((word: string) => word.length > 0).length;
  } 
  // If content is JSON array (block format)
  else if (Array.isArray(content)) {
    for (const block of content) {
      if (block.content) {
        if (typeof block.content === 'string') {
          wordCount += block.content.split(/\s+/).filter((word: string) => word.length > 0).length;
        } else if (Array.isArray(block.content)) {
          for (const item of block.content) {
            if (typeof item === 'string') {
              wordCount += item.split(/\s+/).filter((word: string) => word.length > 0).length;
            } else if (Array.isArray(item)) {
              for (const cell of item) {
                if (typeof cell === 'string') {
                  wordCount += cell.split(/\s+/).filter((word: string) => word.length > 0).length;
                }
              }
            }
          }
        }
      }
    }
  }

  // Average reading speed is 200 words per minute, round up
  return Math.max(1, Math.ceil(wordCount / 200));
}
