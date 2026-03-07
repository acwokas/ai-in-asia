// scout-assistant v2
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

// ── Perplexity enrichment helper ─────────────────────────────────────
async function enrichWithPerplexity(title: string, content: string, apiKey: string): Promise<string> {
  if (!apiKey) return '';
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide factual, current information with citations. Focus on Asia-Pacific where possible. Be concise and factual only — no opinions.',
          },
          {
            role: 'user',
            content: `For a news article titled "${title}", provide:
1. 3-5 current statistics or data points with their sources (publication name and approximate date)
2. Any notable Asia-Pacific specific developments, companies, or regulations related to this topic
3. One or two recent expert quotes or statements (with attribution — name, title, organisation) if they exist in public record
4. Any significant recent developments in the last 60 days

Be specific. Only include verifiable information. Format as a simple numbered list.`,
          },
        ],
        max_tokens: 600,
        return_citations: true,
      }),
    });
    if (!response.ok) return '';
    const data = await response.json();
    const enrichment = data.choices?.[0]?.message?.content || '';
    const citations = data.citations ? `\n\nSources: ${data.citations.slice(0, 5).join(', ')}` : '';
    return enrichment + citations;
  } catch (err) {
    console.error('Perplexity enrichment failed (non-fatal):', err);
    return '';
  }
}

// ── rewrite-with-images ──────────────────────────────────────────────
async function handleRewriteWithImages(
  content: string,
  context: any,
  apiKey: string,
  cors: Record<string, string>,
) {
  // Requires PERPLEXITY_API_KEY to be set in Supabase Edge Function secrets
  // Add via: Supabase Dashboard → Edge Functions → Manage secrets → PERPLEXITY_API_KEY
  // Get key from: https://www.perplexity.ai/settings/api

  const title = context?.title || '';
  const contextKeyphrase = context?.focusKeyphrase || '';

  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY') || '';
  const enrichmentData = await enrichWithPerplexity(title, content, PERPLEXITY_API_KEY);
  const enrichmentSection = enrichmentData
    ? `\n\nRESEARCH ENRICHMENT (verified facts and citations you MUST draw from):\n${enrichmentData}\n`
    : '';

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
  const rewriteSystemPrompt = `You are Scout, the senior editor at AIinASIA.com. You are a sharp, opinionated editorial voice covering AI across Asia-Pacific. Rewrite the article to be deeply informative, well-structured, and optimised for search. Use British English throughout. Maintain factual accuracy above all else.

CONTENT DEPTH (MANDATORY):
- The rewritten article MUST be at least 900 words. If the source material is thin, add genuine context, background, and implications — do not pad with waffle.
- Include a "By The Numbers" block near the top of the article: a short <ul> of 3-5 specific statistics or data points relevant to the topic. These MUST come from the original content or the Research Enrichment data below. Label it with <h3>By The Numbers</h3> or <strong>By The Numbers</strong>.
- Include a FAQ section at the END of the article (before the closing paragraph): 2-3 questions a reader would genuinely ask, with concise answers. Format as: <h3>Frequently Asked Questions</h3> followed by <h4>Question?</h4><p>Answer.</p> pairs. Questions should target common search queries related to the topic.

ASIA-PACIFIC ANGLE (MANDATORY — not optional):
- Every article MUST include a named Asia-Pacific section or clearly labelled callout. Use a <h2> like "What This Means for Asia" or "The Asia-Pacific Picture" or similar relevant heading.
- Reference at least one specific country, company, regulator, or market dynamic by name. Use the Research Enrichment data for this if the original article lacks it.
- CRITICAL: Only reference REAL, verifiable facts. Do NOT fabricate statistics, company names, quotes, or research. Better a shorter Asia section with real data than a longer one with invented content.

QUOTES AND BLOCKQUOTES:
- You MUST include at least 2 <blockquote> elements.
- Blockquotes must ONLY contain: (a) direct quotes from named individuals that appear in the original source content, (b) verified quotes from the Research Enrichment data with attribution, or (c) a striking statistic or data point in quote style. NEVER fabricate a quote.
- Format: <blockquote>"Quote text." - Name, Title, Organisation</blockquote> or <blockquote>Statistic or data point - Source Name</blockquote>

KEYWORD OPTIMISATION:
- Use the focus keyphrase naturally 4-6 times throughout the article (including in at least one H2).
- Use each keyphrase synonym 1-2 times each.
- Do not force keywords awkwardly — natural usage only.

LINKS:
- Do NOT preserve links from the original content. Replace them all with links from the lists provided below.
- ALL external links must use the exact URLs provided. Do NOT invent or modify URLs.
- ALL internal links must use the exact paths provided. Do NOT invent or modify paths.
- Anchor text for internal links must be descriptive and contextual. Never use "click here", "read more", "this article", or the raw article title as the entire anchor. Instead write natural anchor text that describes what the reader will find, incorporating the focus keyphrase or related keywords where it reads naturally. Example: instead of <a href="/path">Singapore AI regulation article</a>, write <a href="/path">Singapore's evolving AI regulatory framework</a>.
${internalLinksInstruction}${externalLinksSection}${enrichmentSection}

MID-ARTICLE IMAGE PLACEHOLDER:
- Place exactly one IMAGE_PLACEHOLDER_HERE on its own line roughly 40-60% through the content.
- On the line immediately after IMAGE_PLACEHOLDER_HERE, write a short descriptive caption for the image wrapped in a figcaption tag: <figcaption>Caption text here, no longer than 15 words, describes what the image shows, may naturally include the focus keyphrase.</figcaption>
- Do NOT write markdown image syntax or full <figure> tags — just IMAGE_PLACEHOLDER_HERE followed by the <figcaption> on the next line.

FORMATTING RULES (ALL MANDATORY):
- Output clean HTML only. No markdown syntax whatsoever.
- NEVER use em dashes (— or –). Replace any em dash construction with a full stop, a comma, or rewrite the sentence. This is a hard rule - no exceptions.
- Use: <h2> for main sections (4-6 sections), <h3> for subheadings, <h4> for FAQ questions
- NEVER use <h1> tags. The article title is already rendered as H1 by the page template. Using <h1> in the body creates a duplicate heading and will break SEO.
- The article MUST open with a <h2> subheading as its very first element - never start with a <p> tag. The opening <h2> should frame the story angle, not restate the headline. Think of it as a deck head.
- <p> for paragraphs — 2-4 sentences each, NEVER more than 5 sentences
- <strong> for bold (minimum 6 per article), <em> for italic
- <ul><li> and <ol><li> for lists — you MUST include at least 2 separate list blocks in the article
- <a href="..."> for links (external links: target="_blank" rel="noopener noreferrer")
- <blockquote> for quotes and data callouts
- MAXIMUM 2 consecutive paragraphs before a visual break (subheading, blockquote, list, or callout). This is a hard rule. Dense prose blocks will be penalised by search crawlers.
- Where the article compares options, tools, approaches, or time periods: use a <table> with <thead> and <tbody>. This is strongly preferred over prose comparisons.

CLOSING SECTION (MANDATORY - two distinct elements, rendered separately):

Element 1 - Scout's editorial position, wrapped in a styled callout div:
<div class="scout-view"><strong>The AIinASIA View:</strong> 2 sentences expressing AIinASIA's clear, opinionated view on the topic. Confident and specific, not hedged. Scout has a point of view.</div>

Element 2 - Reader invitation, as a plain <p> tag immediately after the div:
<p>1 sentence ending with a specific, direct question using "you" or "your", followed by "Drop your take in the comments below."</p>

Example output:
<div class="scout-view"><strong>The AIinASIA View:</strong> The real risk here isn't the technology. It's the regulatory vacuum that lets companies deploy it without meaningful accountability. Asia's fragmented policy landscape makes this especially urgent.</div>
<p>So here's what we want to know: what would it actually take for you to trust an AI system with a high-stakes decision? Drop your take in the comments below.</p>

Do NOT use "Final Thoughts", "Conclusion", or any closing heading. The two elements must always appear together at the end, in order.

Return your response as a single JSON object with these fields. Every field is required:

{
  "rewrittenContent": "Full article in clean HTML. Contains the article body with <h2>/<h3>/<h4> headings, By The Numbers block, blockquotes, lists, tables where appropriate, FAQ section, IMAGE_PLACEHOLDER_HERE, and links. No markdown. No [TAG] wrappers.",
  "headline": "Punchy headline under 60 characters. Specific and newsworthy. No colons or semicolons. British English.",
  "excerpt": "A hook under 140 characters. Make the reader need to click. Not a summary.",
  "tldr": ["Bullet 1 under 100 chars, specific stat or fact", "Bullet 2 under 100 chars", "Bullet 3 under 100 chars, so what / implication"],
  "whoShouldPayAttention": "Audience 1 | Audience 2 | Audience 3",
  "whatChangesNext": "One specific, forward-looking sentence.",
  "category": "Exactly one of: News, Business, Life, Learn, Create, Voices, Policy",
  "seoTitle": "SEO display title under 60 chars. Include focus keyphrase.",
  "metaTitle": "HTML meta title under 60 chars with primary keyword near the start",
  "metaDescription": "Under 155 chars. Include the focus keyphrase. Make it compelling enough to click.",
  "focusKeyphrase": "Primary keyword phrase, 2-4 words",
  "keyphraseSynonyms": "3-5 comma-separated synonym phrases",
  "aiTags": Array of 4-8 lowercase tag strings. These power internal content recommendations and search. Use specific, searchable terms: technology names, company names, country names, policy frameworks, topic areas. Examples: "openai", "singapore", "generative ai", "healthcare ai", "llm", "regulation", "startups". No spaces within a tag. Use hyphens for multi-word tags e.g. "large-language-models".
  "heroImageDescription": "Write a specific photo brief as if directing a photographer. Describe: (1) the primary subject and action, a real person, place, object, or scene directly related to the article topic; (2) the setting and environment; (3) the mood or emotion you want the image to convey. Be specific to THIS article, not a generic AI or tech image. Example: 'A Southeast Asian woman in her 30s reviewing data on a tablet in a modern Singapore office, expression focused and confident, warm afternoon light through floor-to-ceiling windows, cityscape visible behind her.'",
  "heroImageAlt": "Short alt text under 45 chars. Include focus keyphrase if natural.",
  "heroImageCaption": "One sentence caption for the hero image. Describes what is shown, max 20 words, may include focus keyphrase naturally. Written as a caption a photo editor would use, not marketing copy.",
  "midImageDescription": "Write a specific photo brief for a supporting in-article image. This must show a DIFFERENT subject, angle, or moment from the hero image — zoom in on a detail, show a different person or location, or illustrate a specific point made in the article body. Same specificity rules: real scene, real subject, directly related to the article. Example: 'Close-up of hands on a laptop keyboard with a translation interface visible on screen, shallow depth of field, soft natural light from the left, warm tones.'",
  "midImageAlt": "Short alt text under 45 chars",
  "aiTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  const rewritePrompt = `Title: ${title}
Focus Keyphrase: ${contextKeyphrase}

Article Content:
${content}`;

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

  const rewriteResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: rewriteSystemPrompt,
      messages: [
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
  const rawResult = rewriteData.content?.[0]?.text || '';

  let rewrittenContent: string;
  let heroImageDescription: string;
  let heroImageAltText: string;
  let heroImageCaption: string = '';
  let midImageDescription: string;
  let midImageAltText: string;

  let parsed: any = {};
  try {
    const cleaned = rawResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
    rewrittenContent = parsed.rewrittenContent || rawResult;
    heroImageDescription = parsed.heroImageDescription || '';
    heroImageAltText = (parsed.heroImageAlt || '').slice(0, 125);
    heroImageCaption = parsed.heroImageCaption || '';
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
  } catch (parseErr) {
    console.warn('Could not parse rewrite JSON, attempting fallback extraction:', parseErr);
    // Try to extract just the rewrittenContent field even if full parse fails
    let fallbackContent = rawResult;
    try {
      // Try to find rewrittenContent value in the raw string
      const contentMatch = rawResult.match(/"rewrittenContent"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"(?:headline|excerpt|tldr|category)|"\s*})/);
      if (contentMatch?.[1]) {
        // Unescape JSON string escapes
        fallbackContent = contentMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        console.log('Fallback extraction succeeded, content length:', fallbackContent.length);
      } else {
        // Strip JSON wrappers if present
        fallbackContent = rawResult
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .replace(/^\s*\{\s*"rewrittenContent"\s*:\s*"/i, '')
          .replace(/"\s*,?\s*"headline"[\s\S]*$/i, '')
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();
        console.log('Regex strip fallback, content length:', fallbackContent.length);
      }
    } catch {
      console.warn('Fallback extraction also failed, using raw result');
    }
    return new Response(
      JSON.stringify({ result: fallbackContent, imagesGenerated: 0 }),
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

    const generateHeroImage = async (description: string): Promise<{ url: string }> => {
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
            { role: 'user', content: `Editorial magazine cover photograph. ${description}

COMPOSITION: Wide establishing shot. Strong visual hierarchy. Subject positioned right-of-centre or upper third, leaving clear negative space on the left for a title overlay. Foreground element to add depth.

LIGHTING: Cinematic. Either soft directional window light with gentle shadows, warm golden-hour outdoor light, or dramatic studio lighting with clear key and fill. Rich contrast without crushing blacks.

STYLE: Photorealistic, shot on full-frame camera, 35mm lens equivalent. Shallow depth of field with sharp subject and softly blurred background. Color grading: warm, slightly desaturated mid-tones with rich saturated highlights. The mood should feel premium, considered, and human — like a spread in Bloomberg Businessweek or Monocle magazine.

PEOPLE: Where the topic involves people, show real human subjects — diverse, Asian representation prioritised for Asia-Pacific topics. Candid or lightly directed poses, never stiff stock-photo poses.

HARD RULES: No text, logos, watermarks, or UI elements in the image. No robot hands, glowing brains, neural networks, binary code, circuit boards, or any AI visual clichés. No flat design or illustration. No dark or black backgrounds. No generic "technology" imagery (keyboards, screens, server racks). The image must be unmistakably about the specific topic, not a generic tech visual.` }
          ],
          modalities: ['image', 'text'],
        }),
      });
      if (!imgResponse.ok) throw new Error(`Hero image generation failed [${imgResponse.status}]`);
      const imgData = await imgResponse.json();
      const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!base64Url) throw new Error('No image in response');
      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const filePath = `content/${slugifiedKeyphrase}-hero-${timestamp}.png`;
      const { error: uploadError } = await supabase.storage.from('article-images').upload(filePath, binaryData, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(filePath);
      return { url: publicUrl };
    };

    const generateMidImage = async (description: string): Promise<{ url: string }> => {
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
            { role: 'user', content: `Editorial in-article photograph. ${description}

COMPOSITION: Tighter than a cover shot — medium or close-up framing. Centred or symmetrical composition is fine here. Can focus on a specific detail, object, moment, or person that supports the article narrative. Does NOT need to leave space for text overlay.

LIGHTING: Natural and authentic. Soft diffused light, overcast outdoor, or warm interior ambient. Avoid dramatic studio lighting — this image should feel like a documentary or reportage photograph.

STYLE: Photorealistic, 50–85mm lens equivalent. Can have slightly more depth of field than the hero (more context in frame). Color grading: natural, slightly cooler tones than the hero to create visual contrast between the two images. The mood should feel informative and grounded — like a supporting photograph inside The Economist or Wired.

PEOPLE: Where relevant, show people in action or mid-task — working, talking, interacting with technology or environment. Real and candid, not posed.

HARD RULES: No text, logos, watermarks, or UI elements. No AI visual clichés (robot hands, glowing brains, circuit boards, binary code). No flat design or illustration. No black backgrounds. Must be clearly related to the specific topic described, not a generic visual.` }
          ],
          modalities: ['image', 'text'],
        }),
      });
      if (!imgResponse.ok) throw new Error(`Mid image generation failed [${imgResponse.status}]`);
      const imgData = await imgResponse.json();
      const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!base64Url) throw new Error('No image in response');
      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const filePath = `content/${slugifiedKeyphrase}-mid-${timestamp}.png`;
      const { error: uploadError } = await supabase.storage.from('article-images').upload(filePath, binaryData, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(filePath);
      return { url: publicUrl };
    };

    const results = await Promise.allSettled([
      generateHeroImage(heroImageDescription),
      generateMidImage(midImageDescription),
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
    finalContent = finalContent.replace(
      /IMAGE_PLACEHOLDER_HERE\n<figcaption>(.*?)<\/figcaption>/g,
      `\n\n<figure>\n\n![${safeAlt}](${midImage})\n\n<figcaption>$1</figcaption>\n</figure>\n\n`
    );
    // Fallback for IMAGE_PLACEHOLDER_HERE without figcaption
    finalContent = finalContent.replace(/IMAGE_PLACEHOLDER_HERE/g, `\n\n![${safeAlt}](${midImage})\n\n`);
  } else {
    finalContent = finalContent.replace(/IMAGE_PLACEHOLDER_HERE/g, '');
  }

  finalContent = finalContent.replace(/\n{3,}/g, '\n\n').trim();

  // Touch updated_at so sitemap recrawl priority is refreshed after every rewrite
  const articleId = context?.articleId || context?.currentArticleId;
  if (articleId) {
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      await supabaseClient
        .from('articles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', articleId);
    } catch (touchErr) {
      console.error('Failed to touch updated_at (non-fatal):', touchErr);
    }
  }

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
      featuredImageCaption: heroImageCaption,
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
