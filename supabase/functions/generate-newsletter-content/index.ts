import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArticleSummary {
  title: string;
  summary: string;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for admin auth if called manually
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(supabase, authHeader);
    if (user) {
      await requireAdmin(supabase, user.id);
    }

    const { edition_id } = await req.json();

    if (!edition_id) {
      throw new Error('edition_id is required');
    }

    console.log(`Generating AI content for edition: ${edition_id}`);

    // Fetch the edition and its top stories
    const { data: edition, error: editionError } = await supabase
      .from('newsletter_editions')
      .select('*')
      .eq('id', edition_id)
      .single();

    if (editionError || !edition) {
      throw new Error('Edition not found');
    }

    // Fetch top stories with full article content
    const { data: topStories } = await supabase
      .from('newsletter_top_stories')
      .select(`
        position,
        articles (
          id, title, excerpt, content,
          categories:primary_category_id (name, slug)
        )
      `)
      .eq('edition_id', edition_id)
      .order('position');

    if (!topStories || topStories.length === 0) {
      throw new Error('No top stories found for this edition');
    }

    // Build context about this week's articles
    const articleSummaries = topStories.map((story: any) => ({
      title: story.articles.title,
      excerpt: story.articles.excerpt || '',
      category: story.articles.categories?.name || 'General',
    }));

    const articlesContext = articleSummaries
      .map((a: any, i: number) => `${i + 1}. "${a.title}" (${a.category}): ${a.excerpt}`)
      .join('\n');

    // Generate content using Lovable AI
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is required for AI content generation');
    }

    // Generate Editor's Note
    const editorNotePrompt = `You are an editor for AI in ASIA, a publication covering artificial intelligence across Asia. 

Based on this week's top stories:
${articlesContext}

Write a concise Editor's Note (60-80 words) that:
1. Sets context for what's happening in AI across Asia this week
2. References 1-2 key themes (regulation, platforms, adoption, regional signals)
3. Uses an authoritative but accessible editorial voice
4. Does NOT use bullet points or lists
5. Does NOT start with "This week" - be more creative

Return ONLY the paragraph text, no headers or quotes.`;

    const worthWatchingPrompt = `You are an editor for AI in ASIA, a publication covering artificial intelligence across Asia.

Based on this week's top stories:
${articlesContext}

Write a "Worth Watching" paragraph (50-70 words) that:
1. Highlights a forward-looking signal or trend
2. May reference policy timelines, platform trends, or regional shifts
3. Avoids predictions framed as certainty - use language like "signals suggest", "worth monitoring"
4. Does NOT use bullet points or lists
5. Focuses on what readers should keep an eye on next

Return ONLY the paragraph text, no headers or quotes.`;

    // Call Lovable AI for Editor's Note
    console.log('Generating Editor\'s Note...');
    const editorNoteResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert AI news editor writing for a business audience in Asia. Be concise, authoritative, and insightful.' },
          { role: 'user', content: editorNotePrompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!editorNoteResponse.ok) {
      const error = await editorNoteResponse.text();
      console.error('Editor Note API error:', error);
      throw new Error(`Failed to generate editor note: ${error}`);
    }

    const editorNoteData = await editorNoteResponse.json();
    const editorNote = editorNoteData.choices?.[0]?.message?.content?.trim() || '';

    // Call Lovable AI for Worth Watching
    console.log('Generating Worth Watching...');
    const worthWatchingResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert AI news editor writing for a business audience in Asia. Focus on forward-looking trends and signals.' },
          { role: 'user', content: worthWatchingPrompt }
        ],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!worthWatchingResponse.ok) {
      const error = await worthWatchingResponse.text();
      console.error('Worth Watching API error:', error);
      throw new Error(`Failed to generate worth watching: ${error}`);
    }

    const worthWatchingData = await worthWatchingResponse.json();
    const worthWatching = worthWatchingData.choices?.[0]?.message?.content?.trim() || '';

    // Generate one-sentence summaries for each article
    console.log('Generating article summaries...');
    const summaries: ArticleSummary[] = [];

    for (const story of topStories) {
      const article = story.articles as any;
      const summaryPrompt = `Write a single compelling sentence (15-25 words) that summarizes why this article matters:
Title: "${article.title}"
Excerpt: ${article.excerpt || 'No excerpt available'}

The sentence should:
- Focus on the impact or significance
- Be written for busy executives
- NOT start with "This article" or "The article"
- NOT use generic phrases like "explores", "discusses", "looks at"

Return ONLY the sentence, no quotes.`;

      const summaryResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'user', content: summaryPrompt }
          ],
          max_tokens: 100,
          temperature: 0.6,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const summary = summaryData.choices?.[0]?.message?.content?.trim() || article.excerpt;
        summaries.push({
          title: article.title,
          summary,
          category: article.categories?.name || 'General',
        });
      }
    }

    // Update the edition with generated content
    const { error: updateError } = await supabase
      .from('newsletter_editions')
      .update({
        editor_note: editorNote,
        worth_watching: worthWatching,
        ai_generated_at: new Date().toISOString(),
      })
      .eq('id', edition_id);

    if (updateError) {
      console.error('Failed to update edition:', updateError);
      throw new Error('Failed to save generated content');
    }

    // Update article summaries in newsletter_top_stories
    for (let i = 0; i < summaries.length; i++) {
      await supabase
        .from('newsletter_top_stories')
        .update({ ai_summary: summaries[i].summary })
        .eq('edition_id', edition_id)
        .eq('position', i + 1);
    }

    console.log('Newsletter content generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        editor_note: editorNote,
        worth_watching: worthWatching,
        summaries,
        word_counts: {
          editor_note: editorNote.split(/\s+/).length,
          worth_watching: worthWatching.split(/\s+/).length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating newsletter content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
