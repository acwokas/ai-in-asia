import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, currentArticleId } = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch published articles for internal linking
    const query = supabase
      .from('articles')
      .select(`
        id, 
        title, 
        slug, 
        excerpt,
        primary_category_id,
        categories!articles_primary_category_id_fkey (slug)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (currentArticleId) {
      query.neq('id', currentArticleId);
    }

    const { data: articles } = await query;
    const articlesList = articles?.map(a => {
      const categorySlug = (a.categories as any)?.slug || 'news';
      return `- ${a.title} (/${categorySlug}/${a.slug})`;
    }).join('\n') || '';

    const systemPrompt = `You are an expert content writer and editor specialising in British English. Your task is to completely rewrite articles from a fresh perspective while maintaining accuracy and educational value.

CRITICAL REQUIREMENTS:
- Write in British English spelling (colour, organisation, analyse, etc.)
- Use a chatty, engaging tone - think intelligent conversation over coffee, not academic paper
- NEVER use em dashes (—) - use commas, full stops, or semicolons instead
- Avoid AI writing tell-tales: no "delve", "tapestry", "realm", "unlock", "leverage", "dive into", "embark", or overly flowery language
- Be conversational and personable - imagine you're explaining to a smart friend who's interested
- Use contractions naturally (it's, that's, you'll, we're) - this is how people actually talk
- Vary sentence structure - mix short punchy sentences with longer flowing ones
- Include specific examples and concrete details
- Keep it concise and punchy - get to the point without waffle

INTERNAL & EXTERNAL LINKING:
- Naturally integrate 2-4 internal links to our existing articles using relevant anchor text
- Add at least 1 authoritative external link to support claims (research papers, official reports, major publications)
- External links MUST use this format: [text](url)^  - the ^ makes them open in new tabs
- Internal links MUST use EXACT URL from list including /category/slug format: [text](/category/article-slug)
- NEVER use [text](/article-slug) format - always include the category from the provided list
- Place links where they add value, not forced
- Make anchor text natural and descriptive

AVAILABLE ARTICLES FOR INTERNAL LINKING:
${articlesList}

FORMATTING REQUIREMENTS:
- Use ## for H2 headings (main sections)
- Use > for blockquotes (for emphasis or notable quotes)
- Use **bold** for emphasis sparingly
- Use *italic* for subtle emphasis or terms
- Keep paragraphs relatively short (2-4 sentences typically)
- Use bullet points with - when listing items
- Add line breaks between sections for readability

CONTENT APPROACH:
- Completely rewrite from a fresh angle, not just rephrasing
- Maintain factual accuracy and educational value
- Add insights or perspectives that weren't in the original
- Use active voice predominantly
- Be specific rather than generic
- Include relevant context where helpful
- Get to the point quickly - avoid unnecessary preamble

Return ONLY the rewritten markdown content with embedded links, nothing else.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Rewrite this article completely with a fresh perspective, including internal links from our articles and at least one external authoritative link:\n\n${content}` }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    const rewrittenContent = data.choices[0].message.content;

    // Generate excerpt if title is provided
    let excerpt = '';
    if (title) {
      const excerptPrompt = `Create a short, engaging excerpt (2-3 sentences, max 160 characters) for this article titled "${title}". The excerpt should:
- Use British English spelling
- Be conversational but professional
- Encourage readers to click through to read more
- Not use em dashes
- Be punchy and intriguing

Article content:
${rewrittenContent.substring(0, 500)}...`;

      const excerptResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: excerptPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (excerptResponse.ok) {
        const excerptData = await excerptResponse.json();
        excerpt = excerptData.choices[0].message.content.trim();
        // Enforce 160 character limit
        if (excerpt.length > 160) {
          excerpt = excerpt.substring(0, 157) + '...';
        }
      }
    }

    return new Response(
      JSON.stringify({ rewrittenContent, excerpt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scout-rewrite-article:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
