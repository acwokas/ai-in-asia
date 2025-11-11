import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS_THRESHOLD = 7; // Refresh if not updated in 7 days
const EDITORS_PICKS_LOCATIONS = ['homepage', 'sidebar'];
const PICKS_PER_LOCATION = 3;
const TRENDING_SLOTS = 6;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      editorsPicksRefreshed: false,
      trendingRefreshed: false,
      homepageTrendingRefreshed: false,
      details: [] as string[]
    };

    // Check and refresh Editors Picks
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS_THRESHOLD);

    for (const location of EDITORS_PICKS_LOCATIONS) {
      // Check last update time for this location
      const { data: recentPicks } = await supabase
        .from('editors_picks')
        .select('updated_at, created_at')
        .eq('location', location)
        .order('updated_at', { ascending: false })
        .limit(1);

      const needsRefresh = !recentPicks?.length || 
        new Date(recentPicks[0].updated_at || recentPicks[0].created_at) < sevenDaysAgo;

      if (needsRefresh) {
        // Get top articles by views and recency
        const { data: topArticles } = await supabase
          .from('articles')
          .select('id')
          .eq('status', 'published')
          .order('view_count', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(PICKS_PER_LOCATION);

        if (topArticles && topArticles.length > 0) {
          // Delete old picks for this location
          await supabase
            .from('editors_picks')
            .delete()
            .eq('location', location);

          // Insert new picks
          const newPicks = topArticles.map(article => ({
            article_id: article.id,
            location: location
          }));

          await supabase
            .from('editors_picks')
            .insert(newPicks);

          results.editorsPicksRefreshed = true;
          results.details.push(`Refreshed ${location} editors picks with ${topArticles.length} articles`);
        }
      }
    }

    // Check and refresh Category Trending (is_trending)
    const { data: trendingArticles } = await supabase
      .from('articles')
      .select('updated_at, id')
      .eq('is_trending', true)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(1);

    const trendingNeedsRefresh = !trendingArticles?.length ||
      new Date(trendingArticles[0].updated_at) < sevenDaysAgo;

    if (trendingNeedsRefresh) {
      // Reset all trending flags
      await supabase
        .from('articles')
        .update({ is_trending: false })
        .eq('is_trending', true);

      // Get recent popular articles
      const { data: popularArticles } = await supabase
        .from('articles')
        .select('id')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(TRENDING_SLOTS);

      if (popularArticles && popularArticles.length > 0) {
        // Set new trending articles
        const articleIds = popularArticles.map(a => a.id);
        await supabase
          .from('articles')
          .update({ is_trending: true })
          .in('id', articleIds);

        results.trendingRefreshed = true;
        results.details.push(`Refreshed ${popularArticles.length} trending articles`);
      }
    }

    // Check and refresh Homepage Trending (homepage_trending)
    const { data: homepageTrending } = await supabase
      .from('articles')
      .select('updated_at, id')
      .eq('homepage_trending', true)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(1);

    const homepageTrendingNeedsRefresh = !homepageTrending?.length ||
      new Date(homepageTrending[0].updated_at) < sevenDaysAgo;

    if (homepageTrendingNeedsRefresh) {
      // Reset all homepage trending flags
      await supabase
        .from('articles')
        .update({ homepage_trending: false })
        .eq('homepage_trending', true);

      // Get recent popular articles for homepage
      const { data: popularForHomepage } = await supabase
        .from('articles')
        .select('id')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(TRENDING_SLOTS);

      if (popularForHomepage && popularForHomepage.length > 0) {
        // Set new homepage trending articles
        const articleIds = popularForHomepage.map(a => a.id);
        await supabase
          .from('articles')
          .update({ homepage_trending: true })
          .in('id', articleIds);

        results.homepageTrendingRefreshed = true;
        results.details.push(`Refreshed ${popularForHomepage.length} homepage trending articles`);
      }
    }

    // Log the automation
    await supabase
      .from('newsletter_automation_log')
      .insert({
        job_name: 'auto-refresh-featured-content',
        status: 'success',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        details: results
      });

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in auto-refresh-featured-content:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('newsletter_automation_log')
      .insert({
        job_name: 'auto-refresh-featured-content',
        status: 'failed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
