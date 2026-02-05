import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Subject line options following editorial guidelines
function generateSubjectLines(): { a: string; b: string } {
  const variants = [
    {
      a: 'This week in AI across Asia',
      b: 'AI in ASIA Weekly Brief',
    },
    {
      a: 'AI in ASIA Weekly Brief',
      b: 'What mattered in AI this week across Asia',
    },
    {
      a: 'What mattered in AI this week across Asia',
      b: 'This week in AI across Asia',
    },
  ];
  
  return variants[Math.floor(Math.random() * variants.length)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // Select top 4 articles from last 7 days for "This Week's Signals"
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: topArticles } = await supabase
      .from('articles')
      .select('id, title, primary_category_id, article_type')
      .eq('status', 'published')
      .neq('article_type', 'three_before_nine')
      .neq('article_type', 'editors_note')
      .gte('published_at', sevenDaysAgo.toISOString())
      .order('view_count', { ascending: false })
      .order('like_count', { ascending: false })
      .limit(15);

    if (!topArticles || topArticles.length === 0) {
      throw new Error('No published articles found for newsletter');
    }

    // Diversify by category - select up to 4 articles
    const selectedArticles: string[] = [];
    const usedCategories = new Set<string>();

    for (const article of topArticles) {
      if (selectedArticles.length >= 4) break;
      
      if (!usedCategories.has(article.primary_category_id) || selectedArticles.length >= 2) {
        selectedArticles.push(article.id);
        if (article.primary_category_id) {
          usedCategories.add(article.primary_category_id);
        }
      }
    }

    // Generate subject lines (no emojis, editorial tone)
    const subjects = generateSubjectLines();

    // Create edition
    const permalinkUrl = `/newsletter/archive/${targetDate}`;

    const { data: edition, error: editionError } = await supabase
      .from('newsletter_editions')
      .insert({
        edition_date: targetDate,
        subject_line: subjects.a,
        subject_line_variant_b: subjects.b,
        status: 'draft',
        created_by: user?.id,
        permalink_url: permalinkUrl,
      })
      .select()
      .single();

    if (editionError) throw editionError;

    // Insert top stories (This Week's Signals)
    const topStoriesInserts = selectedArticles.map((articleId, index) => ({
      edition_id: edition.id,
      article_id: articleId,
      original_article_id: articleId,
      position: index + 1,
      manual_override: false,
    }));

    await supabase.from('newsletter_top_stories').insert(topStoriesInserts);

    console.log(`Newsletter edition created successfully: ${edition.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        edition_id: edition.id,
        edition_date: targetDate,
        top_stories_count: selectedArticles.length,
        subject_line: subjects.a,
        permalink_url: permalinkUrl,
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
