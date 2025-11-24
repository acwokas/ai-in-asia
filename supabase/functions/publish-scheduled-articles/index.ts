import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // SECURITY: Validate cron secret to prevent unauthorized access
    const cronSecret = Deno.env.get('CRON_SECRET')
    const providedSecret = req.headers.get('X-Cron-Secret')
    
    if (!cronSecret || providedSecret !== cronSecret) {
      console.error('Unauthorized access attempt to publish-scheduled-articles')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting scheduled articles publish job...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time
    const now = new Date().toISOString()
    console.log('Current time:', now)

    // Find all articles that are scheduled for publishing and the time has passed
    const { data: scheduledArticles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, scheduled_for, status')
      .eq('status', 'scheduled')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)

    if (fetchError) {
      console.error('Error fetching scheduled articles:', fetchError)
      throw fetchError
    }

    console.log(`Found ${scheduledArticles?.length || 0} articles to publish`)

    if (!scheduledArticles || scheduledArticles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No articles to publish',
          count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Publish each article
    const publishResults = []
    for (const article of scheduledArticles) {
      console.log(`Publishing article: ${article.title} (ID: ${article.id})`)
      
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: now,
          scheduled_for: null, // Clear the scheduled time after publishing
        })
        .eq('id', article.id)

      if (updateError) {
        console.error(`Error publishing article ${article.id}:`, updateError)
        publishResults.push({
          id: article.id,
          title: article.title,
          success: false,
          error: updateError.message
        })
      } else {
        console.log(`Successfully published article: ${article.title}`)
        publishResults.push({
          id: article.id,
          title: article.title,
          success: true
        })
      }
    }

    const successCount = publishResults.filter(r => r.success).length
    const failureCount = publishResults.filter(r => !r.success).length

    console.log(`Published ${successCount} articles successfully, ${failureCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${successCount} articles`,
        totalProcessed: scheduledArticles.length,
        successCount,
        failureCount,
        results: publishResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in publish-scheduled-articles function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
