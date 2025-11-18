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

    const { slugs } = await req.json()

    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      throw new Error('slugs array is required')
    }

    console.log(`Attempting to delete ${slugs.length} articles by slug`)

    // Get all article IDs for these slugs
    const { data: articlesData, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('id')
      .in('slug', slugs)

    if (fetchError) throw fetchError

    const articleIds = articlesData?.map(a => a.id) || []
    console.log(`Found ${articleIds.length} articles to delete`)

    if (articleIds.length > 0) {
      // Delete all related records first
      
      await supabaseAdmin.from('article_categories').delete().in('article_id', articleIds)
      await supabaseAdmin.from('article_tags').delete().in('article_id', articleIds)
      await supabaseAdmin.from('comments').delete().in('article_id', articleIds)
      await supabaseAdmin.from('reading_history').delete().in('article_id', articleIds)
      await supabaseAdmin.from('bookmarks').delete().in('article_id', articleIds)
      await supabaseAdmin.from('editors_picks').delete().in('article_id', articleIds)
      await supabaseAdmin.from('newsletter_top_stories').delete().in('article_id', articleIds)
      await supabaseAdmin.from('article_recommendations').delete().in('article_id', articleIds)

      // Now delete the articles
      const { error: articlesError } = await supabaseAdmin
        .from('articles')
        .delete()
        .in('slug', slugs)

      if (articlesError) throw articlesError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${articleIds.length} articles`,
        deletedCount: articleIds.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in delete-articles-by-slug:', error)
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
