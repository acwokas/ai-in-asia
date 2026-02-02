import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 3-Before-9 daily briefing content
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating 3-Before-9 briefing...');

    // Check if it's a weekday
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend - skipping 3-Before-9 generation');
      return new Response(
        JSON.stringify({ message: 'Weekend - briefing not generated', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const todayStr = today.toISOString().split('T')[0];

    // Check if briefing already exists for today
    const { data: existingBriefing } = await supabase
      .from('articles')
      .select('id')
      .eq('article_type', 'three_before_nine')
      .gte('created_at', todayStr)
      .maybeSingle();

    if (existingBriefing) {
      console.log('Briefing already exists for today');
      return new Response(
        JSON.stringify({ message: 'Briefing already exists', skipped: true, article_id: existingBriefing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest 3 published articles from the last 24-48 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const { data: recentArticles } = await supabase
      .from('articles')
      .select(`
        id, title, slug, excerpt, content,
        categories:primary_category_id (name, slug)
      `)
      .eq('status', 'published')
      .neq('article_type', 'three_before_nine')
      .neq('article_type', 'policy')
      .gte('published_at', yesterday.toISOString())
      .order('published_at', { ascending: false })
      .limit(10);

    if (!recentArticles || recentArticles.length < 3) {
      console.log('Not enough recent articles for briefing');
      return new Response(
        JSON.stringify({ message: 'Not enough recent articles', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Diversify by category - select 3 articles
    const selectedArticles: any[] = [];
    const usedCategories = new Set<string>();

    for (const article of recentArticles) {
      if (selectedArticles.length >= 3) break;
      const catId = (article.categories as any)?.slug;
      if (!usedCategories.has(catId) || selectedArticles.length >= 2) {
        selectedArticles.push(article);
        if (catId) usedCategories.add(catId);
      }
    }

    // Get Intelligence Desk author
    const { data: author } = await supabase
      .from('authors')
      .select('id')
      .eq('name', 'Intelligence Desk')
      .single();

    if (!author) {
      throw new Error('Intelligence Desk author not found');
    }

    // Build briefing content
    const dateFormatted = today.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Generate AI summaries for each article
    let signals = '';
    const signalSummaries: string[] = [];

    if (lovableApiKey) {
      for (const article of selectedArticles) {
        const summaryPrompt = `Write a brief 2-sentence signal for a morning briefing about this article:
Title: "${article.title}"
Excerpt: ${article.excerpt || 'No excerpt'}

The signal should:
- First sentence: What happened (factual, 15-20 words)
- Second sentence: Why it matters (insight, 15-20 words)
- Be written for busy executives checking their morning news
- Sound journalistic and authoritative

Return ONLY the two sentences.`;

        const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: summaryPrompt }],
            max_tokens: 150,
            temperature: 0.6,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const summary = data.choices?.[0]?.message?.content?.trim() || article.excerpt;
          signalSummaries.push(summary);
        } else {
          signalSummaries.push(article.excerpt || '');
        }
      }
    }

    // Build top_list_items JSON structure
    const topListItems = selectedArticles.map((article, index) => ({
      rank: index + 1,
      name: article.title,
      description: signalSummaries[index] || article.excerpt || '',
      link: `/${(article.categories as any)?.slug || 'news'}/${article.slug}`,
      linkType: 'internal',
    }));

    // Generate TLDR bullets using AI
    let tldrSnapshot = {
      bullets: [] as string[],
      whoShouldPayAttention: 'AI strategists, policy watchers, and technology leaders across Asia.',
      whatChangesNext: 'Monitor developments through the week as these stories evolve.',
    };

    if (lovableApiKey) {
      const tldrPrompt = `Based on these 3 AI news signals:
${selectedArticles.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}

Generate 3 brief TLDR bullets (each 8-12 words) that summarize the key takeaways for the day.
Return as JSON: { "bullets": ["bullet1", "bullet2", "bullet3"] }`;

      const tldrResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: tldrPrompt }],
          max_tokens: 200,
          temperature: 0.6,
        }),
      });

      if (tldrResponse.ok) {
        const tldrData = await tldrResponse.json();
        const content = tldrData.choices?.[0]?.message?.content?.trim() || '';
        try {
          const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
          if (parsed.bullets) {
            tldrSnapshot.bullets = parsed.bullets;
          }
        } catch {
          console.log('Could not parse TLDR JSON, using defaults');
        }
      }
    }

    // Create the briefing article
    const slug = `three-before-nine-${todayStr}`;
    const title = `3-Before-9 · ${dateFormatted}`;

    const { data: newArticle, error: insertError } = await supabase
      .from('articles')
      .insert({
        title,
        slug,
        article_type: 'three_before_nine',
        author_id: author.id,
        status: 'published',
        published_at: new Date().toISOString(),
        top_list_items: topListItems,
        tldr_snapshot: tldrSnapshot,
        excerpt: `Your daily AI briefing: ${selectedArticles.length} signals to start your day.`,
        content: { type: 'doc', content: [] },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create briefing:', insertError);
      throw insertError;
    }

    // Log automation
    await supabase.from('newsletter_automation_log').insert({
      job_name: 'generate-three-before-nine',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      details: { article_id: newArticle.id, signals: selectedArticles.length },
    });

    console.log(`3-Before-9 briefing created: ${newArticle.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        article_id: newArticle.id,
        slug: newArticle.slug,
        signals: selectedArticles.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating 3-Before-9:', error);

    // Log failed automation
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('newsletter_automation_log').insert({
        job_name: 'generate-three-before-nine',
        status: 'failed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        details: { error: error.message },
      });
    } catch (logError) {
      console.error('Failed to log automation error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
