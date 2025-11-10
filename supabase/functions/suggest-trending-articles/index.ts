import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArticleEngagement {
  id: string
  title: string
  slug: string
  featured_image_url: string
  view_count: number
  comment_count: number
  like_count: number
  published_at: string
  engagement_score: number
  authors: { name: string; slug: string } | null
  categories: { name: string; slug: string } | null
  homepage_trending: boolean
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

    // Get the time range from query params (default: 48 hours)
    const url = new URL(req.url)
    const hoursBack = parseInt(url.searchParams.get('hours') || '48')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    console.log(`Analyzing articles from the last ${hoursBack} hours`)

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hoursBack)

    // Fetch articles from the specified time range
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select(`
        id,
        title,
        slug,
        featured_image_url,
        view_count,
        comment_count,
        like_count,
        published_at,
        homepage_trending,
        authors (name, slug),
        categories:primary_category_id (name, slug)
      `)
      .eq('status', 'published')
      .gte('published_at', cutoffDate.toISOString())
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching articles:', error)
      throw error
    }

    if (!articles || articles.length === 0) {
      console.log('No articles found in the specified time range')
      return new Response(
        JSON.stringify({ 
          suggestions: [],
          message: 'No articles found in the specified time range',
          timeRange: `${hoursBack} hours`,
          cutoffDate: cutoffDate.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${articles.length} articles to analyze`)

    // Calculate engagement score for each article
    // Formula: (views * 1) + (comments * 5) + (likes * 3)
    // Comments are weighted higher as they indicate deeper engagement
    const articlesWithScores: ArticleEngagement[] = articles.map((article: any) => {
      const viewScore = (article.view_count || 0) * 1
      const commentScore = (article.comment_count || 0) * 5
      const likeScore = (article.like_count || 0) * 3
      const engagementScore = viewScore + commentScore + likeScore

      // Add recency bonus: newer articles get a slight boost
      const hoursSincePublished = (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60)
      const recencyBonus = Math.max(0, (hoursBack - hoursSincePublished) / hoursBack) * 10

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        featured_image_url: article.featured_image_url,
        view_count: article.view_count,
        comment_count: article.comment_count,
        like_count: article.like_count,
        published_at: article.published_at,
        homepage_trending: article.homepage_trending,
        authors: article.authors?.[0] || null,
        categories: article.categories?.[0] || null,
        engagement_score: engagementScore + recencyBonus
      }
    })

    // Sort by engagement score (highest first)
    articlesWithScores.sort((a, b) => b.engagement_score - a.engagement_score)

    // Get top articles
    const suggestions = articlesWithScores.slice(0, limit)

    // Filter out articles already marked as homepage trending
    const newSuggestions = suggestions.filter(a => !a.homepage_trending)
    const alreadyTrending = suggestions.filter(a => a.homepage_trending)

    console.log(`Top ${limit} articles by engagement:`)
    suggestions.forEach((article, index) => {
      console.log(`${index + 1}. "${article.title}" - Score: ${article.engagement_score.toFixed(2)} (Views: ${article.view_count}, Comments: ${article.comment_count}, Likes: ${article.like_count})`)
    })

    return new Response(
      JSON.stringify({ 
        suggestions: newSuggestions,
        alreadyTrending,
        stats: {
          totalArticlesAnalyzed: articles.length,
          timeRange: `${hoursBack} hours`,
          cutoffDate: cutoffDate.toISOString(),
          newSuggestionsCount: newSuggestions.length,
          alreadyTrendingCount: alreadyTrending.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in suggest-trending-articles:', error)
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
