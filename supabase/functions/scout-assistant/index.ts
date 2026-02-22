import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Handle validate-links action separately
    if (action === 'validate-links') {
      return await handleValidateLinks(content, corsHeaders);
    }

    // Handle rewrite-with-images action separately
    if (action === 'rewrite-with-images') {
      return await handleRewriteWithImages(content, context, LOVABLE_API_KEY, corsHeaders);
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'improve':
        systemPrompt = 'You are Scout, an expert editorial assistant for AIinASIA.com. Improve the given text while maintaining the author\'s voice. Focus on clarity, engagement, and British English. Always end the article with a compelling final paragraph that includes a thought-provoking question or bold statement designed to spark discussion in the comments. This should feel natural, not forced - tie it back to the article\'s core argument. Do NOT label it as a conclusion or use headings like "Final Thoughts" or "Conclusion". Just make the last paragraph land with impact and invite the reader to respond. Return only the improved text.';
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

// ── rewrite-with-images ──────────────────────────────────────────────
async function handleRewriteWithImages(
  content: string,
  context: any,
  apiKey: string,
  cors: Record<string, string>,
) {
  const title = context?.title || '';
  const focusKeyphrase = context?.focusKeyphrase || '';

  // Step 1: Rewrite + get image suggestions in one AI call
  const rewriteSystemPrompt = `You are Scout, an expert editorial assistant for AIinASIA.com.
Rewrite the article content to be engaging, well-structured, and optimised for SEO.
Use British English. Maintain factual accuracy.

LINKS — CRITICAL:
- Preserve ALL existing markdown links from the original content. Do not remove or break any links.
- Add 1-2 relevant external links to authoritative sources (research papers, official announcements, reputable news sites like Reuters, Bloomberg, TechCrunch, MIT Technology Review, etc.) using proper markdown link syntax [text](url). Use REAL, VALID URLs only — never use placeholder or made-up URLs.

MID-ARTICLE IMAGE PLACEHOLDER:
- Place the EXACT text [MID_ARTICLE_IMAGE] on its own line where a mid-article image should appear (ideally after the 3rd or 4th paragraph).
- Write ONLY [MID_ARTICLE_IMAGE] — nothing else on that line. No description, no markdown image syntax, no alt text.
- The system will automatically replace this placeholder with the actual uploaded image.
- Do NOT write any markdown image syntax like ![...](...) anywhere in the content.

EXCERPT:
- Also generate a 1-2 sentence excerpt (under 160 characters) summarising the article for previews.

IMAGE DESCRIPTIONS (for AI generation — NOT to be included in the article text):
1. A hero/lead image that captures the article's theme
2. A mid-article image for the [MID_ARTICLE_IMAGE] position
For each, provide a short alt text (under 125 characters) for the img alt attribute.

Return your response in this EXACT JSON format (no markdown fences):
{
  "rewrittenContent": "the full rewritten article in markdown with [MID_ARTICLE_IMAGE] placeholder",
  "excerpt": "1-2 sentence summary under 160 characters",
  "heroImageDescription": "detailed description for AI image generation",
  "heroImageAlt": "short alt text under 125 chars",
  "midImageDescription": "detailed description for AI image generation",
  "midImageAlt": "short alt text under 125 chars"
}

Always end the article with a compelling final paragraph that includes a thought-provoking question or bold statement designed to spark discussion in the comments. This should feel natural, not forced - tie it back to the article's core argument. Examples: 'But here's the uncomfortable question...' or 'The real test will be...' or 'What does this mean for you?' Do NOT label it as a conclusion or use headings like 'Final Thoughts' or 'Conclusion'. Just make the last paragraph land with impact and invite the reader to respond.`;

  const rewritePrompt = `Title: ${title}
Focus Keyphrase: ${focusKeyphrase}

Article Content:
${content}`;

  const rewriteResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: rewriteSystemPrompt },
        { role: 'user', content: rewritePrompt },
      ],
    }),
  });

  if (!rewriteResponse.ok) {
    const status = rewriteResponse.status;
    const body = await rewriteResponse.text();
    console.error('Rewrite AI call failed:', status, body);
    if (status === 429 || status === 402) {
      return new Response(JSON.stringify({ error: status === 429 ? 'Rate limit exceeded.' : 'Credits required.' }), {
        status, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    throw new Error('AI rewrite failed');
  }

  const rewriteData = await rewriteResponse.json();
  const rawResult = rewriteData.choices?.[0]?.message?.content || '';

  let rewrittenContent: string;
  let excerpt = '';
  let heroImageDescription: string;
  let heroImageAltText: string;
  let midImageDescription: string;
  let midImageAltText: string;

  try {
    const cleaned = rawResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    rewrittenContent = parsed.rewrittenContent || rawResult;
    excerpt = (parsed.excerpt || '').slice(0, 160);
    heroImageDescription = parsed.heroImageDescription || '';
    heroImageAltText = (parsed.heroImageAlt || '').slice(0, 125);
    midImageDescription = parsed.midImageDescription || '';
    midImageAltText = (parsed.midImageAlt || '').slice(0, 125);
  } catch {
    console.warn('Could not parse rewrite JSON, returning content without images');
    return new Response(
      JSON.stringify({ result: rawResult, imagesGenerated: 0 }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // Step 2: Generate images in parallel (graceful fallback)
  let featuredImage = '';
  let featuredImageAlt = '';
  let midImage = '';
  let midImageAlt = '';
  let imagesGenerated = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const generateAndUpload = async (description: string, suffix: string): Promise<{ url: string }> => {
      const timestamp = Date.now();
      const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [
            { role: 'user', content: `Generate a professional, editorial-quality image for a news article. The image should be photorealistic, well-lit, and suitable for a technology news website. Description: ${description}` },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!imgResponse.ok) {
        throw new Error(`Image generation failed [${imgResponse.status}]`);
      }

      const imgData = await imgResponse.json();
      const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!base64Url) throw new Error('No image in response');

      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const filePath = `content/ai-generated-${suffix}-${timestamp}.png`;
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, binaryData, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      return { url: publicUrl };
    };

    const results = await Promise.allSettled([
      generateAndUpload(heroImageDescription, 'hero'),
      generateAndUpload(midImageDescription, 'mid'),
    ]);

    if (results[0].status === 'fulfilled') {
      featuredImage = results[0].value.url;
      featuredImageAlt = heroImageAltText || heroImageDescription.slice(0, 125);
      imagesGenerated++;
    } else {
      console.error('Hero image generation failed:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      midImage = results[1].value.url;
      midImageAlt = midImageAltText || midImageDescription.slice(0, 125);
      imagesGenerated++;
    } else {
      console.error('Mid image generation failed:', results[1].reason);
    }
  } catch (imgError) {
    console.error('Image generation error (non-fatal):', imgError);
  }

  // Step 3: Replace [MID_ARTICLE_IMAGE] with actual image markdown or remove it
  let finalContent = rewrittenContent;
  if (midImage) {
    finalContent = finalContent.replace(/\[MID_ARTICLE_IMAGE\]/g, `\n\n![${midImageAlt}](${midImage})\n\n`);
  } else {
    finalContent = finalContent.replace(/\[MID_ARTICLE_IMAGE\]/g, '');
  }

  // Safety net: strip any remaining [MID_ARTICLE_IMAGE] placeholders
  finalContent = finalContent.replace(/\[MID_ARTICLE_IMAGE\]/g, '');

  // Strip leaked image prompt lines (lines starting with ! followed by 50+ chars but no (url))
  finalContent = finalContent.replace(/^!(?:\[[^\]]*\])?\s*[A-Z].{50,}$/gm, '');

  // Clean up excessive blank lines
  finalContent = finalContent.replace(/\n{3,}/g, '\n\n').trim();

  return new Response(
    JSON.stringify({
      result: finalContent,
      excerpt,
      featuredImage,
      featuredImageAlt,
      imagesGenerated,
    }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
}

// ── validate-links ───────────────────────────────────────────────────
async function handleValidateLinks(content: string, cors: Record<string, string>) {
  // Extract URLs from markdown links and bare URLs
  const markdownLinks = [...(content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g))].map(m => m[2]);
  const bareUrls = [...(content.matchAll(/https?:\/\/[^\s\)]+/g))].map(m => m[0]);
  const allUrls = [...new Set([...markdownLinks, ...bareUrls])].slice(0, 20);

  const results = await Promise.allSettled(
    allUrls.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const resp = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeout);
        return {
          url,
          status: resp.status,
          ok: resp.ok,
          redirectUrl: resp.redirected ? resp.url : undefined,
        };
      } catch (e) {
        clearTimeout(timeout);
        return {
          url,
          status: 0,
          ok: false,
          error: e instanceof Error ? e.message : 'Request failed',
        };
      }
    })
  );

  const linkResults = results.map(r => r.status === 'fulfilled' ? r.value : { url: 'unknown', status: 0, ok: false, error: 'Promise rejected' });

  return new Response(
    JSON.stringify({ results: linkResults }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
}
