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

    const now = new Date().toISOString();

    // Find all unpublished AI comments where comment_date has passed
    const { data: commentsToPublish, error: fetchError } = await supabase
      .from('ai_generated_comments')
      .select('id, article_id, comment_date')
      .eq('published', false)
      .lte('comment_date', now);

    if (fetchError) throw fetchError;

    if (!commentsToPublish || commentsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No scheduled comments to publish',
          published: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Publish all eligible comments
    const commentIds = commentsToPublish.map(c => c.id);
    
    const { error: updateError } = await supabase
      .from('ai_generated_comments')
      .update({ published: true })
      .in('id', commentIds);

    if (updateError) throw updateError;

    console.log(`Published ${commentIds.length} scheduled AI comments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${commentIds.length} scheduled comments`,
        published: commentIds.length,
        commentIds 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Error publishing scheduled comments:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
