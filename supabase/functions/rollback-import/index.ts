import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { batchId } = await req.json()

    if (!batchId) {
      throw new Error('batchId is required')
    }

    // First, get all article IDs for this batch
    const { data: articlesData, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('id')
      .eq('batch_id', batchId)

    if (fetchError) throw fetchError

    const articleIds = articlesData?.map(a => a.id) || []
    console.log(`Found ${articleIds.length} articles to delete`)

    if (articleIds.length > 0) {
      // Delete all related records first (to handle foreign key constraints)
      
      // Delete article_categories
      await supabaseAdmin
        .from('article_categories')
        .delete()
        .in('article_id', articleIds)
      
      // Delete article_tags
      await supabaseAdmin
        .from('article_tags')
        .delete()
        .in('article_id', articleIds)
      
      // Delete comments
      await supabaseAdmin
        .from('comments')
        .delete()
        .in('article_id', articleIds)
      
      // Delete reading_history
      await supabaseAdmin
        .from('reading_history')
        .delete()
        .in('article_id', articleIds)
      
      // Delete bookmarks
      await supabaseAdmin
        .from('bookmarks')
        .delete()
        .in('article_id', articleIds)
      
      // Delete editors_picks
      await supabaseAdmin
        .from('editors_picks')
        .delete()
        .in('article_id', articleIds)
      
      // Delete newsletter_top_stories
      await supabaseAdmin
        .from('newsletter_top_stories')
        .delete()
        .in('article_id', articleIds)
      
      // Delete article_recommendations
      await supabaseAdmin
        .from('article_recommendations')
        .delete()
        .in('article_id', articleIds)

      // Now delete the articles
      const { error: articlesError } = await supabaseAdmin
        .from('articles')
        .delete()
        .eq('batch_id', batchId)

      if (articlesError) throw articlesError
    }

    // Delete all url_mappings with this batch_id
    const { error: mappingsError } = await supabaseAdmin
      .from('url_mappings')
      .delete()
      .eq('batch_id', batchId)

    if (mappingsError) throw mappingsError

    // Update migration log status
    await supabaseAdmin
      .from('migration_logs')
      .update({ status: 'rolled_back' })
      .eq('batch_id', batchId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${articleIds.length} articles and all related data` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in rollback-import:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
