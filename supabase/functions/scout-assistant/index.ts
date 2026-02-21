import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, content, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'improve':
        systemPrompt = 'You are Scout, an expert editorial assistant for AIinASIA.com. Improve the given text while maintaining the author\'s voice. Focus on clarity, engagement, and British English. Return only the improved text.';
        userPrompt = `Improve this text:\n\n${content}`;
        break;
      
      case 'shorten':
        systemPrompt = 'You are Scout, an editorial assistant. Make the given text more concise while preserving key information and maintaining British English. Return only the shortened text.';
        userPrompt = `Shorten this text:\n\n${content}`;
        break;
      
      case 'expand':
        systemPrompt = 'You are Scout, an editorial assistant. Expand the given text with relevant details and examples while maintaining coherence. Use British English. Return only the expanded text.';
        userPrompt = `Expand this text:\n\n${content}`;
        break;
      
      case 'summarize':
        systemPrompt = 'You are Scout, an assistant that creates concise summaries. Create a 2-3 sentence summary suitable for article previews. Use British English.';
        userPrompt = `Summarize this article:\n\n${content}`;
        break;
      
      case 'suggest-tags':
        systemPrompt = 'You are Scout, an assistant that suggests relevant tags for AI and technology articles. Return only a JSON array of 3-5 relevant tags as strings. Focus on AI, machine learning, technology, and Asia-specific topics when relevant.';
        userPrompt = `Suggest tags for this article:\n\nTitle: ${context?.title || ''}\n\nContent: ${content}`;
        break;
      
      case 'seo-title':
        systemPrompt = 'You are Scout, an SEO expert. Create an engaging, SEO-optimized title under 60 characters. Use British English. Return only the title text.';
        userPrompt = `Create an SEO title for:\n\n${content}`;
        break;
      
      case 'meta-description':
        systemPrompt = 'You are Scout, an SEO expert. Create an engaging meta description under 160 characters that includes relevant keywords. Use British English. Return only the description text.';
        userPrompt = `Create a meta description for:\n\nTitle: ${context?.title || ''}\n\nContent: ${content}`;
        break;
      
      case 'catchy-headline':
        systemPrompt = `You are a senior news editor.
Your job is to rewrite the headline I give you so it is sharper, more specific, and more clickable without becoming clickbait and without changing the core factual meaning.

Rules:
- Keep it under 60 characters.
- Make the subject and action crystal clear on first read.
- Use strong, concrete verbs and specific details.
- Avoid vague phrases, exaggeration, and questions unless they truly add value.
- Keep the tone aligned with a credible digital news site, not a tabloid.
- Use British English.

Return your response in this EXACT format:
BEST: [your best revised headline]
ALT1: [alternative option 1]
ALT2: [alternative option 2]
ALT3: [alternative option 3]`;
        userPrompt = `Here is the current headline:\n${content}`;
        break;
      
      case 'custom':
        systemPrompt = context?.systemPrompt || 'You are Scout, a helpful AI assistant. Use British English.';
        userPrompt = content;
        break;
      
      default:
        throw new Error('Invalid action');
    }

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires additional credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content || '';

    // For tag suggestions, try to parse as JSON
    if (action === 'suggest-tags') {
      try {
        const parsed = JSON.parse(result);
        result = Array.isArray(parsed) ? parsed : [result];
      } catch {
        // If not valid JSON, split by commas or return as single tag
        result = result.includes(',') 
          ? result.split(',').map((t: string) => t.trim())
          : [result.trim()];
      }
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scout-assistant function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
