import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSubjectLines(heroTitle: string): { a: string; b: string } {
  const variants = [
    {
      a: `🤖 This Week in AI: ${heroTitle}`,
      b: `Your Weekly AI Digest: ${heroTitle}`,
    },
    {
      a: `AI Weekly: ${heroTitle} + More`,
      b: `🌏 APAC AI News: ${heroTitle}`,
    },
    {
      a: `Must-Read AI: ${heroTitle}`,
      b: `This Week's Top AI Story: ${heroTitle}`,
    },
  ];
  
  return variants[Math.floor(Math.random() * variants.length)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate admin
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(supabase, authHeader);
    
    if (user) {
      await requireAdmin(supabase, user.id);
    }

    const { edition_date } = await req.json();
    const targetDate = edition_date || new Date().toISOString().split('T')[0];

    console.log(`Generating newsletter for ${targetDate}`);

    // Check if edition already exists
    const { data: existing } = await supabase
      .from('newsletter_editions')
      .select('id')
      .eq('edition_date', targetDate)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Edition already exists for this date', edition_id: existing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Select hero article (top performer from last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: heroArticle } = await supabase
      .from('articles')
      .select('id, title')
      .eq('status', 'published')
      .gte('published_at', sevenDaysAgo.toISOString())
      .order('view_count', { ascending: false })
      .order('like_count', { ascending: false })
      .limit(1)
      .single();

    if (!heroArticle) {
      throw new Error('No published articles found for hero selection');
    }

    // Generate subject lines
    const subjects = generateSubjectLines(heroArticle.title);

    // 2. Select top 5 stories (diverse categories)
    const { data: topArticles } = await supabase
      .from('articles')
      .select('id, primary_category_id')
      .eq('status', 'published')
      .gte('published_at', sevenDaysAgo.toISOString())
      .neq('id', heroArticle.id)
      .order('view_count', { ascending: false })
      .limit(20);

    // Diversify by category
    const selectedArticles: string[] = [];
    const usedCategories = new Set<string>();

    for (const article of topArticles || []) {
      if (selectedArticles.length >= 5) break;
      
      if (!usedCategories.has(article.primary_category_id) || selectedArticles.length >= 3) {
        selectedArticles.push(article.id);
        if (article.primary_category_id) {
          usedCategories.add(article.primary_category_id);
        }
      }
    }

    // 3. Select mystery link (never used, not expired)
    const { data: mysteryLink } = await supabase
      .from('newsletter_mystery_links')
      .select('id, used_in_editions')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    // 4. Select fun fact (least recently used)
    const { data: funFact } = await supabase
      .from('newsletter_fun_facts')
      .select('id')
      .eq('is_active', true)
      .order('used_count', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    // 5. Select sponsor (highest priority active)
    const { data: sponsor } = await supabase
      .from('newsletter_sponsors')
      .select('id')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    // 6. Get community pulse metrics
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('articles_read, points, comments_made');

    const totalArticlesRead = userStats?.reduce((sum, stat) => sum + (stat.articles_read || 0), 0) || 0;
    const totalPointsEarned = userStats?.reduce((sum, stat) => sum + (stat.points || 0), 0) || 0;
    const totalComments = userStats?.reduce((sum, stat) => sum + (stat.comments_made || 0), 0) || 0;

    // Create edition
    const { data: edition, error: editionError } = await supabase
      .from('newsletter_editions')
      .insert({
        edition_date: targetDate,
        subject_line: subjects.a,
        subject_line_variant_b: subjects.b,
        hero_article_id: heroArticle.id,
        hero_article_original: heroArticle.id,
        status: 'draft',
        created_by: user?.id,
        comments_count_override: totalComments,
      })
      .select()
      .single();

    if (editionError) throw editionError;

    // Insert top stories
    const topStoriesInserts = selectedArticles.map((articleId, index) => ({
      edition_id: edition.id,
      article_id: articleId,
      original_article_id: articleId,
      position: index + 1,
      manual_override: false,
    }));

    await supabase.from('newsletter_top_stories').insert(topStoriesInserts);

    // Update mystery link usage if found
    if (mysteryLink) {
      const updatedUsage = [...(mysteryLink.used_in_editions || []), edition.id];
      await supabase
        .from('newsletter_mystery_links')
        .update({ used_in_editions: updatedUsage })
        .eq('id', mysteryLink.id);
    }

    // Update fun fact usage if found
    if (funFact) {
      await supabase.rpc('increment', {
        table_name: 'newsletter_fun_facts',
        row_id: funFact.id,
        column_name: 'used_count',
      });
      
      await supabase
        .from('newsletter_fun_facts')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', funFact.id);
    }

    console.log(`Newsletter edition created successfully: ${edition.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        edition_id: edition.id,
        edition_date: targetDate,
        hero_article: heroArticle.title,
        top_stories_count: selectedArticles.length,
        metrics: {
          articles_read: totalArticlesRead,
          points_earned: totalPointsEarned,
          comments: totalComments,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating newsletter:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
