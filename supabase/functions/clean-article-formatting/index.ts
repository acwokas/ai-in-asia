import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, getUserFromAuth } from '../_shared/requireAdmin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArticleContent {
  type: string
  content?: string | string[]
  attrs?: any
}

function cleanContent(content: ArticleContent[]): ArticleContent[] {
  const decodeHtmlEntities = (text: string): string => {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&lsquo;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/\*\*/g, '')
  }
  
  return content.map(block => {
    const cleanedBlock = { ...block }
    
    // Clean string content
    if (typeof cleanedBlock.content === 'string') {
      cleanedBlock.content = decodeHtmlEntities(cleanedBlock.content)
    }
    
    // Clean array content (lists)
    if (Array.isArray(cleanedBlock.content)) {
      cleanedBlock.content = cleanedBlock.content.map(item => 
        typeof item === 'string' ? decodeHtmlEntities(item) : item
      )
    }
    
    return cleanedBlock
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    const user = await getUserFromAuth(supabaseClient, authHeader)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await requireAdmin(supabaseClient, user.id)

    console.log('Fetching articles with formatting issues...')

    // Fetch all published articles
    const { data: articles, error: fetchError } = await supabaseClient
      .from('articles')
      .select('id, title, slug, content')
      .eq('status', 'published')

    if (fetchError) {
      console.error('Error fetching articles:', fetchError)
      throw fetchError
    }

    console.log(`Found ${articles?.length || 0} articles to process`)

    let cleanedCount = 0
    const results = []

    for (const article of articles || []) {
      const contentStr = JSON.stringify(article.content)
      
      // Check if the content has ** markers or HTML entities
      const needsCleaning = contentStr.includes('**') || 
                           contentStr.includes('&nbsp;') ||
                           contentStr.includes('&amp;') ||
                           contentStr.includes('&quot;') ||
                           contentStr.includes('&ldquo;') ||
                           contentStr.includes('&rdquo;')
      
      if (needsCleaning) {
        console.log(`Cleaning article: ${article.title} (${article.slug})`)
        
        try {
          const cleanedContent = cleanContent(article.content as ArticleContent[])
          
          // Update the article
          const { error: updateError } = await supabaseClient
            .from('articles')
            .update({ 
              content: cleanedContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id)

          if (updateError) {
            console.error(`Error updating article ${article.slug}:`, updateError)
            results.push({
              id: article.id,
              slug: article.slug,
              status: 'error',
              error: updateError.message
            })
          } else {
            cleanedCount++
            results.push({
              id: article.id,
              slug: article.slug,
              status: 'cleaned'
            })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Error processing article ${article.slug}:`, error)
          results.push({
            id: article.id,
            slug: article.slug,
            status: 'error',
            error: errorMessage
          })
        }
      } else {
        results.push({
          id: article.id,
          slug: article.slug,
          status: 'already_clean'
        })
      }
    }

    console.log(`Cleaned ${cleanedCount} articles`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned ${cleanedCount} articles`,
        totalProcessed: articles?.length || 0,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in clean-article-formatting function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
