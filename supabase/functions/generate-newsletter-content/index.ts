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

interface WorthWatchingSection {
  title: string;
  content: string;
}

interface WorthWatching {
  trends: WorthWatchingSection | null;
  events: WorthWatchingSection | null;
  spotlight: WorthWatchingSection | null;
  policy: WorthWatchingSection | null;
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

    const { edition_id, sections } = await req.json();

    if (!edition_id) {
      throw new Error('edition_id is required');
    }

    // sections can be: ["editor_note", "worth_watching", "subject_lines", "summaries"]
    // If not specified, generate all
    const generateAll = !sections || sections.length === 0;
    const shouldGenerateEditorNote = generateAll || sections?.includes('editor_note');
    const shouldGenerateWorthWatching = generateAll || sections?.includes('worth_watching');
    const shouldGenerateSubjectLines = generateAll || sections?.includes('subject_lines');
    const shouldGenerateSummaries = generateAll || sections?.includes('summaries');

    console.log(`Generating AI content for edition: ${edition_id}`, { sections, generateAll });

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

    // Fetch upcoming events for events section
    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('title, city, country, start_date, event_type')
      .gte('start_date', new Date().toISOString())
      .order('start_date')
      .limit(5);

    // Fetch recent policy articles for policy section
    const { data: policyArticles } = await supabase
      .from('articles')
      .select('title, excerpt, country, policy_status')
      .eq('article_type', 'policy')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3);

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

    // Generate Editor's Note (if requested)
    let editorNote = edition.editor_note || '';
    
    if (shouldGenerateEditorNote) {
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

      console.log('Generating Editor\'s Note...');
      const editorNoteResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
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
      editorNote = editorNoteData.choices?.[0]?.message?.content?.trim() || '';
    }

    // Generate Worth Watching sections (if requested)
    const existingWorthWatching = edition.worth_watching as WorthWatching | null;
    const worthWatching: WorthWatching = existingWorthWatching || {
      trends: null,
      events: null,
      spotlight: null,
      policy: null,
    };

    if (shouldGenerateWorthWatching) {
      console.log('Generating Worth Watching sections...');

    // 1. Emerging AI Trends
    const trendsPrompt = `You are an editor for AI in ASIA, a publication covering artificial intelligence across Asia.

Based on this week's top stories:
${articlesContext}

Write a "Emerging AI Trends" section (40-60 words) that:
1. Identifies 2-3 rising trends or themes spotted across recent coverage
2. Examples: 'Edge AI adoption accelerating in Southeast Asia', 'Enterprise LLM deployments maturing'
3. Uses language like "signals suggest", "momentum building around"
4. Focuses on patterns, not individual stories

Return a JSON object with "title" and "content" keys. The title should be a catchy 3-5 word headline. Return ONLY valid JSON.`;

    const trendsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: trendsPrompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (trendsResponse.ok) {
      const trendsData = await trendsResponse.json();
      const trendsContent = trendsData.choices?.[0]?.message?.content?.trim() || '';
      try {
        const cleaned = trendsContent.replace(/```json\n?|\n?```/g, '').trim();
        worthWatching.trends = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse trends JSON:', e);
        worthWatching.trends = { title: 'Emerging Trends', content: trendsContent };
      }
    }

    // 2. Upcoming Events
    const eventsContext = upcomingEvents?.map((e: any) => 
      `- ${e.title} (${e.city}, ${e.country}) - ${new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    ).join('\n') || 'No upcoming events found.';

    const eventsPrompt = `You are an editor for AI in ASIA, a publication covering AI events across Asia.

Upcoming AI events:
${eventsContext}

Write an "Upcoming Events" section (40-60 words) that:
1. Highlights 2-3 notable AI events, conferences, or webinars happening soon
2. Mentions the event names, locations, and dates
3. Uses an informative, calendar-like tone
4. Encourages readers to mark their calendars

Return a JSON object with "title" and "content" keys. The title should be a catchy 3-5 word headline. Return ONLY valid JSON.`;

    const eventsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: eventsPrompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      const eventsContent = eventsData.choices?.[0]?.message?.content?.trim() || '';
      try {
        const cleaned = eventsContent.replace(/```json\n?|\n?```/g, '').trim();
        worthWatching.events = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse events JSON:', e);
        worthWatching.events = { title: 'Mark Your Calendar', content: eventsContent };
      }
    }

    // 3. Company/Startup Spotlight
    const spotlightPrompt = `You are an editor for AI in ASIA, a publication covering AI companies across Asia.

Based on this week's top stories:
${articlesContext}

Write a "Company Spotlight" section (40-60 words) that:
1. Highlights 1-2 AI companies or startups making moves in Asia
2. Focus on companies mentioned in the articles or related to the themes
3. Brief context on what they're doing and why it matters
4. Use phrases like "worth keeping an eye on", "emerging player"

Return a JSON object with "title" and "content" keys. The title should name the company/companies featured. Return ONLY valid JSON.`;

    const spotlightResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: spotlightPrompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (spotlightResponse.ok) {
      const spotlightData = await spotlightResponse.json();
      const spotlightContent = spotlightData.choices?.[0]?.message?.content?.trim() || '';
      try {
        const cleaned = spotlightContent.replace(/```json\n?|\n?```/g, '').trim();
        worthWatching.spotlight = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse spotlight JSON:', e);
        worthWatching.spotlight = { title: 'Companies to Watch', content: spotlightContent };
      }
    }

    // 4. Policy & Regulation Watch
    const policyContext = policyArticles?.map((p: any) => 
      `- ${p.title} (${p.country || 'Asia'}): ${p.excerpt?.slice(0, 100) || 'Policy update'}`
    ).join('\n') || 'No recent policy updates found.';

    const policyPrompt = `You are an editor for AI in ASIA, a publication covering AI policy and regulation across Asia.

Recent policy developments:
${policyContext}

And this week's coverage context:
${articlesContext}

Write a "Policy Watch" section (40-60 words) that:
1. Summarizes pending or recently announced AI policies, regulations, or government initiatives
2. Focus on Asian markets: China, India, Singapore, Japan, Korea, Southeast Asia
3. Use language like "regulators are signaling", "framework expected by", "consultation period closes"
4. Help readers understand what's at stake for their business

Return a JSON object with "title" and "content" keys. The title should reference the key regulatory focus. Return ONLY valid JSON.`;

    const policyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: policyPrompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (policyResponse.ok) {
      const policyData = await policyResponse.json();
      const policyContent = policyData.choices?.[0]?.message?.content?.trim() || '';
      try {
        const cleaned = policyContent.replace(/```json\n?|\n?```/g, '').trim();
        worthWatching.policy = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse policy JSON:', e);
        worthWatching.policy = { title: 'Regulation Watch', content: policyContent };
      }
    }
    } // End of shouldGenerateWorthWatching

    // Generate A/B Subject Lines based on content (if requested)
    let subjectLineA = edition.subject_line || 'This week in AI across Asia';
    let subjectLineB = edition.subject_line_variant_b || 'AI in ASIA Weekly Brief';

    if (shouldGenerateSubjectLines) {
      console.log('Generating A/B subject lines...');
      const subjectPrompt = `You are an email marketing expert for AI in ASIA, a publication covering AI across Asia.

Based on this week's newsletter content:

TOP STORIES:
${articlesContext}

TRENDS: ${worthWatching.trends?.content || 'N/A'}
POLICY: ${worthWatching.policy?.content || 'N/A'}

Generate 2 compelling email subject lines (A/B test variants) that:
1. Are under 50 characters each
2. NO emojis
3. Create curiosity or urgency
4. Reference specific content from this week
5. Variant A: Focus on the lead story or biggest theme
6. Variant B: Use a different angle - could be a question, a number, or contrarian take

Return a JSON object with "subject_a" and "subject_b" keys. Return ONLY valid JSON.`;

      const subjectResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: subjectPrompt }],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      if (subjectResponse.ok) {
        const subjectData = await subjectResponse.json();
        const subjectContent = subjectData.choices?.[0]?.message?.content?.trim() || '';
        try {
          const cleaned = subjectContent.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.subject_a) subjectLineA = parsed.subject_a;
          if (parsed.subject_b) subjectLineB = parsed.subject_b;
          console.log('Generated subject lines:', { subjectLineA, subjectLineB });
        } catch (e) {
          console.error('Failed to parse subject lines JSON:', e);
        }
      }
    }

    // Generate one-sentence summaries for each article (if requested)
    const summaries: ArticleSummary[] = [];

    if (shouldGenerateSummaries) {
      console.log('Generating article summaries...');

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

        const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    }

    // Build update object based on what was generated
    const updateData: Record<string, any> = {
      ai_generated_at: new Date().toISOString(),
    };

    if (shouldGenerateEditorNote) {
      updateData.editor_note = editorNote;
    }
    if (shouldGenerateWorthWatching) {
      updateData.worth_watching = worthWatching;
    }
    if (shouldGenerateSubjectLines) {
      updateData.subject_line = subjectLineA;
      updateData.subject_line_variant_b = subjectLineB;
    }

    const { error: updateError } = await supabase
      .from('newsletter_editions')
      .update(updateData)
      .eq('id', edition_id);

    if (updateError) {
      console.error('Failed to update edition:', updateError);
      throw new Error('Failed to save generated content');
    }

    // Update article summaries in newsletter_top_stories (if generated)
    if (shouldGenerateSummaries && summaries.length > 0) {
      for (let i = 0; i < summaries.length; i++) {
        await supabase
          .from('newsletter_top_stories')
          .update({ ai_summary: summaries[i].summary })
          .eq('edition_id', edition_id)
          .eq('position', i + 1);
      }
    }

    console.log('Newsletter content generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        editor_note: editorNote,
        worth_watching: worthWatching,
        subject_lines: {
          a: subjectLineA,
          b: subjectLineB,
        },
        summaries,
        word_counts: {
          editor_note: editorNote.split(/\s+/).length,
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
