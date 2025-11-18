import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Set up SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get all draft articles
          const { data: articles, error } = await supabase
            .from('articles')
            .select('id, slug, title, status')
            .eq('status', 'draft')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const total = articles?.length || 0;
          
          // Send total count
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'total', count: total })}\n\n`)
          );

          if (total === 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'complete', 
                message: 'No draft articles to publish',
                totalProcessed: 0,
                results: []
              })}\n\n`)
            );
            controller.close();
            return;
          }

          const results = [];
          
          // Process each article
          for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            
            try {
              // Update article to published
              const { error: updateError } = await supabase
                .from('articles')
                .update({ 
                  status: 'published',
                  published_at: new Date().toISOString()
                })
                .eq('id', article.id);

              if (updateError) throw updateError;

              results.push({
                id: article.id,
                slug: article.slug,
                status: 'updated'
              });

              // Send progress
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'progress',
                  article: article.title || article.slug,
                  count: i + 1,
                  progress: ((i + 1) / total) * 100
                })}\n\n`)
              );
            } catch (err) {
              const error = err as Error;
              results.push({
                id: article.id,
                slug: article.slug,
                status: 'error',
                error: error.message
              });

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'error',
                  article: article.title || article.slug,
                  progress: ((i + 1) / total) * 100
                })}\n\n`)
              );
            }
          }

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              message: `Published ${results.filter(r => r.status === 'updated').length} articles`,
              totalProcessed: total,
              results
            })}\n\n`)
          );

          controller.close();
        } catch (err) {
          const error = err as Error;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: error.message
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
