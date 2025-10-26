import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

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

    console.log('Starting to delete all articles...')

    // Get all article IDs
    const { data: articlesData, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('id')

    if (fetchError) throw fetchError

    const articleIds = articlesData?.map(a => a.id) || []
    console.log(`Found ${articleIds.length} articles to delete`)

    if (articleIds.length > 0) {
      // Delete URL mappings FIRST (has foreign key to articles)
      console.log('Deleting URL mappings...')
      await supabaseAdmin
        .from('url_mappings')
        .delete()
        .in('article_id', articleIds)

      // Delete all other related records
      console.log('Deleting related records...')
      
      await supabaseAdmin.from('article_categories').delete().in('article_id', articleIds)
      await supabaseAdmin.from('article_tags').delete().in('article_id', articleIds)
      await supabaseAdmin.from('comments').delete().in('article_id', articleIds)
      await supabaseAdmin.from('reading_history').delete().in('article_id', articleIds)
      await supabaseAdmin.from('bookmarks').delete().in('article_id', articleIds)
      await supabaseAdmin.from('editors_picks').delete().in('article_id', articleIds)
      await supabaseAdmin.from('newsletter_top_stories').delete().in('article_id', articleIds)
      await supabaseAdmin.from('article_recommendations').delete().in('article_id', articleIds)

      console.log('Deleting articles...')
      // Now delete all articles
      const { error: articlesError } = await supabaseAdmin
        .from('articles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (articlesError) throw articlesError

      console.log('Deleting migration logs...')
      // Delete all migration logs
      await supabaseAdmin
        .from('migration_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    }

    console.log(`Successfully deleted ${articleIds.length} articles`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${articleIds.length} articles and all related data`,
        deletedCount: articleIds.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in delete-all-articles:', error)
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
