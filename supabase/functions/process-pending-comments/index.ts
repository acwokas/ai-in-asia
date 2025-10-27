import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing pending comments...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending comments that are due
    const now = new Date().toISOString();
    const { data: pendingComments, error: fetchError } = await supabase
      .from('pending_comments')
      .select('*')
      .lte('scheduled_for', now)
      .limit(50); // Process up to 50 comments per run

    if (fetchError) {
      console.error('Error fetching pending comments:', fetchError);
      throw fetchError;
    }

    if (!pendingComments || pendingComments.length === 0) {
      console.log('No pending comments to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending comments' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingComments.length} pending comments`);

    let processedCount = 0;
    const errors = [];

    for (const pending of pendingComments) {
      try {
        // Generate comment using AI
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
                content: 'You are generating realistic user comments for articles. Create engaging, thoughtful comments that sound authentic.'
              },
              {
                role: 'user',
                content: pending.comment_prompt
              }
            ],
            temperature: 0.8,
          })
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const generatedText = aiData.choices[0].message.content;

        // Parse the generated comment
        const nameMatch = generatedText.match(/Name:\s*(.+)/);
        const commentMatch = generatedText.match(/Comment:\s*(.+)/s);

        const authorName = nameMatch ? nameMatch[1].trim() : 'Anonymous Reader';
        const content = commentMatch ? commentMatch[1].trim().replace(/\s+/g, ' ') : generatedText;

        // Insert the comment
        const { error: insertError } = await supabase
          .from('comments')
          .insert({
            article_id: pending.article_id,
            author_name: authorName,
            content: content,
            approved: true,
            created_at: pending.comment_date || pending.scheduled_for // Use historical date if available
          });

        if (insertError) {
          throw insertError;
        }

        // Delete the pending comment
        const { error: deleteError } = await supabase
          .from('pending_comments')
          .delete()
          .eq('id', pending.id);

        if (deleteError) {
          console.error('Error deleting pending comment:', deleteError);
          // Continue processing other comments even if deletion fails
        }

        processedCount++;
        console.log(`Successfully processed comment for article ${pending.article_id}`);

      } catch (error) {
        console.error(`Error processing pending comment ${pending.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ id: pending.id, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-pending-comments function:', error);
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