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
  const contextKeyphrase = context?.focusKeyphrase || '';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  // ── Internal links: guarantee 5+ ──
  const stopWords = ['that', 'this', 'with', 'from', 'they', 'their', 'have', 'been', 'will', 'what', 'when', 'where', 'which', 'about', 'than', 'into', 'more', 'some'];
  const searchTerms = title.split(/\s+/)
    .filter((w: string) => w.length > 3)
    .filter((w: string) => !stopWords.includes(w.toLowerCase()))
    .slice(0, 5)
    .join(' | ');

  let availableLinks: string[] = [];
  const seenSlugs = new Set<string>();

  const addArticles = (articles: any[]) => {
    for (const a of articles) {
      if (!a.slug || seenSlugs.has(a.slug)) continue;
      seenSlugs.add(a.slug);
      const catSlug = Array.isArray(a.categories) && a.categories.length > 0 ? a.categories[0].slug : 'news';
      availableLinks.push(`[${a.title}](/${catSlug}/${a.slug})`);
    }
  };

  try {
    const [articlesResponse, searchResponse] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/articles?select=title,slug,categories:categories!article_categories(slug)&status=eq.published&order=published_at.desc&limit=10`,
        { headers }
      ),
      searchTerms
        ? fetch(
            `${supabaseUrl}/rest/v1/articles?select=title,slug,categories:categories!article_categories(slug)&status=eq.published&title=wfts.${encodeURIComponent(searchTerms)}&limit=10`,
            { headers }
          )
        : Promise.resolve(null),
    ]);

    const recentArticles = await articlesResponse.json();
    const relevantArticles = searchResponse ? await searchResponse.json() : [];

    addArticles(Array.isArray(relevantArticles) ? relevantArticles : []);
    addArticles(Array.isArray(recentArticles) ? recentArticles : []);

    // Fallback: if fewer than 5, fetch 20 most recent
    if (availableLinks.length < 5) {
      const fallbackResp = await fetch(
        `${supabaseUrl}/rest/v1/articles?select=title,slug,categories:categories!article_categories(slug)&status=eq.published&order=published_at.desc&limit=20`,
        { headers }
      );
      const fallbackArticles = await fallbackResp.json();
      addArticles(Array.isArray(fallbackArticles) ? fallbackArticles : []);
    }

    availableLinks = availableLinks.slice(0, 15);
  } catch (linkErr) {
    console.error('Failed to fetch internal links (non-fatal):', linkErr);
  }

  const internalLinksInstruction = availableLinks.length > 0
    ? `\nINTERNAL LINKS:\n- You MUST incorporate at least 3 internal links from the following list. Place them where they are contextually relevant. Use the exact markdown format provided - do NOT modify the URLs.\n- Available internal links:\n${availableLinks.join('\n')}\n`
    : '';

  // ── External links: pre-verify before passing to AI ──
  const extStopWords = ['that', 'this', 'with', 'from', 'they', 'their', 'have', 'been', 'will', 'what', 'when', 'where', 'which', 'about', 'than', 'into', 'more', 'some', 'also', 'most', 'very', 'just', 'even', 'much'];
  const externalSearchTerms = title.split(/\s+/)
    .filter((w: string) => w.length > 3)
    .filter((w: string) => !extStopWords.includes(w.toLowerCase()))
    .slice(0, 4)
    .join(' & ');

  let externalLinksSection = '';
  try {
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const verifyLinks = async (links: any[]): Promise<any[]> => {
      const verified: any[] = [];
      const results = await Promise.allSettled(
        links.map(async (link: any) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const resp = await fetch(link.url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
            clearTimeout(timeout);
            return resp.ok ? link : null;
          } catch {
            return null;
          }
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) verified.push(r.value);
      }
      return verified;
    };

    let verifiedExtLinks: any[] = [];

    if (externalSearchTerms) {
      const { data: extLinks } = await supabaseClient
        .from('external_links')
        .select('title, url, source_name, domain')
        .textSearch('title', externalSearchTerms, { type: 'websearch' })
        .order('published_at', { ascending: false })
        .limit(15);

      if (extLinks && extLinks.length > 0) {
        const seenDomains = new Set<string>();
        const dedupedLinks = extLinks.filter((link: any) => {
          if (seenDomains.has(link.domain)) return false;
          seenDomains.add(link.domain);
          return true;
        }).slice(0, 8);

        verifiedExtLinks = await verifyLinks(dedupedLinks);

        // Fallback: if fewer than 4 verified, fetch broader
        if (verifiedExtLinks.length < 4) {
          const { data: broadLinks } = await supabaseClient
            .from('external_links')
            .select('title, url, source_name, domain')
            .order('published_at', { ascending: false })
            .limit(30);

          if (broadLinks && broadLinks.length > 0) {
            const existingDomains = new Set(verifiedExtLinks.map((l: any) => l.domain));
            const broadDeduped = broadLinks.filter((link: any) => {
              if (existingDomains.has(link.domain)) return false;
              existingDomains.add(link.domain);
              return true;
            }).slice(0, 10);

            const broadVerified = await verifyLinks(broadDeduped);
            verifiedExtLinks.push(...broadVerified);
          }
        }
      }
    }

    if (verifiedExtLinks.length > 0) {
      const formattedLinks = verifiedExtLinks
        .map((l: any) => `[${l.title}](${l.url}) (${l.source_name})`)
        .join('\n');

      externalLinksSection = `\n\nEXTERNAL LINKS:\n- You MUST incorporate at least 2 external links from the following verified list. Weave them naturally into sentences as supporting references, e.g. 'as MIT Technology Review recently reported, ...' or 'according to Nikkei Asia, ...'. Do NOT dump links at the end of the article. Use the exact URLs provided - do NOT modify them.\n- Available external links:\n${formattedLinks}`;
    }
  } catch (extErr) {
    console.error('Failed to fetch external links (non-fatal):', extErr);
  }

  // ── Step 1: Rewrite + get image suggestions in one AI call ──
  const rewriteSystemPrompt = `You are Scout, the senior editor at AIinASIA.com — a sharp, opinionated editorial voice covering AI across Asia-Pacific.
Rewrite the article to be engaging, well-structured, and optimised for SEO.
Use British English throughout. Maintain factual accuracy.

ASIA-PACIFIC ANGLE:
- Where relevant, weave in an Asia-Pacific perspective — reference regional developments, companies, regulations, or market dynamics.
- CRITICAL: Only reference REAL, verifiable facts. Do NOT fabricate statistics, quotes, company names, or research. Better no Asia angle than a fake one.

LINKS (CRITICAL — READ CAREFULLY):
- Preserve any existing links from the original content exactly as they are.
- Do NOT create new links to websites not listed below.
- ALL external links must include the full https:// URL in the markdown.
${internalLinksInstruction}${externalLinksSection}

MID-ARTICLE IMAGE PLACEHOLDER:
- You MUST place exactly one image placeholder in the article body, roughly 40-60% through the content.
- Write EXACTLY this on its own line and nothing else: IMAGE_PLACEHOLDER_HERE
- Do NOT write any image descriptions, alt text, or markdown image syntax like ![...](...) in the article body.

FORMATTING RULES (MANDATORY — these are not optional):
- Maximum 3 short paragraphs before a visual break (subheading, blockquote, bullet list, or numbered list). This is a hard rule.
- Each paragraph MUST be 2-4 sentences. NEVER write paragraphs longer than 5 sentences.
- You MUST include at least 2 blockquotes using markdown > syntax. Pull out notable quotes, statistics, or key statements. Each blockquote MUST be on its own line starting with > and MUST have a blank line before and after it. Example:

Previous paragraph ends here.

> "The cost per prompt is so high that profitability remains elusive for most AI companies." — Industry analyst

Next paragraph starts here.

- You MUST include at least 1 bullet list OR numbered list to break up dense information.
- Use **bold** for key terms, names, and important phrases (at least 5-8 bold items throughout).
- Use ## subheadings to break the article into 3-5 clear sections with compelling subheadings.
- Labels like **Short-term:**, **Long-term:**, or **Key takeaway:** are encouraged for scannability.

CLOSING PARAGRAPH (MANDATORY):
- The final paragraph MUST be a direct, provocative or collaborative call to action that drives reader comments.
- It MUST end with a specific question directed at the reader using "you" or "your".
- After the question, on the same line, add: "Drop your take in the comments below."
- Do NOT use headings like "Final Thoughts" or "Conclusion".
- Example: "...so the real question isn't whether AI safety matters — it's whether the people making these decisions have earned your trust. What would YOU demand from an AI company before trusting it with critical infrastructure? Drop your take in the comments below."

Return your response as a JSON object with these SEPARATE fields. Do NOT embed tagged sections inside the article content. Every field is required.

{
  "rewrittenContent": "The full rewritten article in markdown. Contains ONLY the article body text with ## subheadings, > blockquotes, bullet lists, bold text, links, and IMAGE_PLACEHOLDER_HERE. Does NOT contain any [HEADLINE] or [EXCERPT] tags — those go in separate fields below.",
  "headline": "A punchy headline under 60 characters. Newspaper front page energy. No colons or semicolons. British English.",
  "excerpt": "A hook under 140 characters that makes someone want to click. NOT a summary.",
  "tldr": ["Bullet 1 under 100 chars", "Bullet 2 under 100 chars", "Bullet 3 under 100 chars"],
  "whoShouldPayAttention": "Audience 1 | Audience 2 | Audience 3",
  "whatChangesNext": "One sentence about implications or what happens next.",
  "category": "Exactly ONE of: News, Business, Life, Learn, Create, Voices, Policy",
  "seoTitle": "SEO display title under 60 chars",
  "metaTitle": "HTML meta title under 60 chars with primary keyword",
  "metaDescription": "Meta description under 155 chars including the focus keyphrase",
  "focusKeyphrase": "Primary keyword phrase, 2-4 words",
  "keyphraseSynonyms": "3-5 comma-separated synonym phrases",
  "heroImageDescription": "Detailed visual description for AI image generation — conceptual and artistic, not stock photo",
  "heroImageAlt": "Short alt text under 45 chars",
  "midImageDescription": "Detailed visual description for the mid-article image",
  "midImageAlt": "Short alt text under 45 chars"
}`;

  const rewritePrompt = `Title: ${title}
Focus Keyphrase: ${contextKeyphrase}

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
  let heroImageDescription: string;
  let heroImageAltText: string;
  let midImageDescription: string;
  let midImageAltText: string;

  let parsed: any = {};
  try {
    const cleaned = rawResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
    rewrittenContent = parsed.rewrittenContent || rawResult;
    heroImageDescription = parsed.heroImageDescription || '';
    heroImageAltText = (parsed.heroImageAlt || '').slice(0, 125);
    midImageDescription = parsed.midImageDescription || '';
    midImageAltText = (parsed.midImageAlt || '').slice(0, 125);
    console.log('Parsed fields check:', {
      hasHeadline: !!parsed.headline,
      hasExcerpt: !!parsed.excerpt,
      hasTldr: !!parsed.tldr,
      hasCategory: !!parsed.category,
      hasSeoTitle: !!parsed.seoTitle,
      hasHeroDesc: !!parsed.heroImageDescription,
      hasMidDesc: !!parsed.midImageDescription,
      contentLength: (parsed.rewrittenContent || '').length,
    });
  } catch {
    console.warn('Could not parse rewrite JSON, returning content without images');
    return new Response(
      JSON.stringify({ result: rawResult, imagesGenerated: 0 }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // ── Step 2: Extract fields directly from JSON (no more regex tag parsing) ──
  let finalContent = rewrittenContent;

  // Direct JSON field extraction — no more fragile [TAG] regex parsing
  const excerpt = (parsed.excerpt || '').substring(0, 140);
  const headline = (parsed.headline || '').substring(0, 60);
  const tldr: string[] = Array.isArray(parsed.tldr)
    ? parsed.tldr.map((b: string) => b.substring(0, 100)).slice(0, 3)
    : [];
  const whoShouldPayAttention = parsed.whoShouldPayAttention || '';
  const whatChangesNext = parsed.whatChangesNext || '';
  const categoryName = parsed.category || '';
  const seoTitle = (parsed.seoTitle || '').substring(0, 60);
  const metaTitle = (parsed.metaTitle || '').substring(0, 60);
  const metaDescription = (parsed.metaDescription || '').substring(0, 155);
  const focusKeyphrase = parsed.focusKeyphrase || '';
  const keyphraseSynonyms = parsed.keyphraseSynonyms || '';

  // Safety: strip any [TAG]...[/TAG] blocks that leaked into the article body
  finalContent = finalContent.replace(/\[(EXCERPT|HEADLINE|TLDR|WHO|WHAT_NEXT|CATEGORY|SEO_TITLE|SEO_META_TITLE|FOCUS_KEYPHRASE|KEYPHRASE_SYNONYMS|META_DESCRIPTION|IMAGE_PROMPT)\][\s\S]*?\[\/\1\]/g, '');

  // ── Look up category ID from database ──
  let categoryId = '';
  if (categoryName) {
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      const { data: catData } = await supabaseClient
        .from('categories')
        .select('id, name')
        .ilike('name', categoryName.trim())
        .limit(1)
        .single();
      if (catData?.id) {
        categoryId = catData.id;
      }
    } catch (catErr) {
      console.error('Category lookup failed (non-fatal):', catErr);
    }
  }

  // ── Step 3: Generate images using focusKeyphrase for filenames ──
  const slugifiedKeyphrase = focusKeyphrase
    ? focusKeyphrase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)
    : 'ai-generated';

  let featuredImage = '';
  let featuredImageAlt = '';
  let midImage = '';
  let midImageAlt = '';
  let imagesGenerated = 0;

  try {
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
            { role: 'user', content: `Create conceptual digital art for a technology news article. NOT a stock photo. NOT photorealistic. Think Wired magazine cover art or New Yorker editorial illustration. Style: Bold dramatic colours with cinematic lighting. Dark moody background using deep navy (#0a0a1a) or charcoal tones. Use teal (#0D9488) and electric blue as primary accent colours. Abstract or metaphorical visual representation of the theme — not a literal depiction. No text, no words, no letters, no UI mockups, no computer screens. Clean composition with space on the left side for a title overlay. Professional, modern, slightly futuristic editorial quality. Topic: ${description}` },
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
      
      const filePath = `content/${slugifiedKeyphrase}-${suffix}-${timestamp}.png`;
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

  // ── Step 4: Safety strip FIRST, then insert our images ──

  // Safety: strip markdown images with alt text over 50 chars (leaked AI prompts)
  // MUST run BEFORE we insert our own controlled images
  finalContent = finalContent.replace(/!\[[^\]]{50,}\]\([^)]*\)/g, '');
  finalContent = finalContent.replace(/^!\[?[^\]\n]{50,}$/gm, '');
  finalContent = finalContent.replace(/\[MID_ARTICLE_IMAGE\]/g, '');

  // NOW insert mid-article image with safe alt text (capped under 50 chars)
  if (midImage) {
    const safeAlt = midImageAlt.substring(0, 45);
    finalContent = finalContent.replace(/IMAGE_PLACEHOLDER_HERE/g, `\n\n![${safeAlt}](${midImage})\n\n`);
  } else {
    finalContent = finalContent.replace(/IMAGE_PLACEHOLDER_HERE/g, '');
  }

  finalContent = finalContent.replace(/\n{3,}/g, '\n\n').trim();

  return new Response(
    JSON.stringify({
      result: finalContent,
      excerpt,
      headline,
      tldr,
      whoShouldPayAttention,
      whatChangesNext,
      featuredImage,
      featuredImageAlt,
      imagesGenerated,
      categoryId,
      categoryName,
      seoTitle,
      metaTitle,
      focusKeyphrase,
      keyphraseSynonyms,
      metaDescription,
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
