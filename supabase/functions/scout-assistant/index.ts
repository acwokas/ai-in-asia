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
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }

    // Handle validate-links action separately
    if (action === 'validate-links') {
      return await handleValidateLinks(content, corsHeaders);
    }

    // Handle rewrite-with-images action separately
    if (action === 'rewrite-with-images') {
      return await handleRewriteWithImages(content, context, GOOGLE_AI_API_KEY, corsHeaders);
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

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
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
          JSON.stringify({ error: 'AI service requires additional credits. Please check your Google AI API quota.' }),
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

// -- Perplexity enrichment helper --
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
            content: 'You are a research assistant. Provide factual, current information with citations. Focus on Asia-Pacific where possible. Be concise and factual only - no opinions.',
          },
          {
            role: 'user',
            content: `For a news article titled "${title}", provide:
1. 3-5 current statistics or data points with their sources (publication name and approximate date)
2. Any notable Asia-Pacific specific developments, companies, or regulations related to this topic
3. One or two recent expert quotes or statements (with attribution - name, title, organisation) if they exist in public record
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
    const citationUrls: string[] = data.citations ? data.citations.slice(0, 5) : [];
    const citationBlock = citationUrls.length > 0
      ? `\n\nPERPLEXITY CITATION URLS (verified, live sources - use at least one as an external link in the article, preferring tier-1 outlets: Reuters, AP, Bloomberg, FT, Nikkei Asia, SCMP, The Straits Times, or equivalent):\n${citationUrls.map((u: string, i: number) => `${i + 1}. ${u}`).join('\n')}`
      : '';
    return enrichment + citationBlock;
  } catch (err) {
    console.error('Perplexity enrichment failed (non-fatal):', err);
    return '';
  }
}

// -- Extract embeddable social / video URLs from source content --
function extractEmbedUrls(content: string): { youtube: string[]; social: string[] } {
  const youtube: string[] = [];
  const social: string[] = [];

  const ytRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})[^\s)"']*/gi;
  let m: RegExpExecArray | null;
  const seenYt = new Set<string>();
  while ((m = ytRegex.exec(content)) !== null) {
    const videoId = m[1];
    if (!seenYt.has(videoId)) {
      seenYt.add(videoId);
      youtube.push(`https://www.youtube.com/watch?v=${videoId}`);
    }
  }

  const twRegex = /https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+[^\s)"']*/gi;
  while ((m = twRegex.exec(content)) !== null) social.push(m[0].replace(/[.,;:!?)]+$/, ''));

  const igRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[\w-]+[^\s)"']*/gi;
  while ((m = igRegex.exec(content)) !== null) social.push(m[0].replace(/[.,;:!?)]+$/, ''));

  const tkRegex = /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+[^\s)"']*/gi;
  while ((m = tkRegex.exec(content)) !== null) social.push(m[0].replace(/[.,;:!?)]+$/, ''));

  const liRegex = /https?:\/\/(?:www\.)?linkedin\.com\/(?:posts|feed\/update)\/[\w:-]+[^\s)"']*/gi;
  while ((m = liRegex.exec(content)) !== null) social.push(m[0].replace(/[.,;:!?)]+$/, ''));

  return { youtube: [...new Set(youtube)].slice(0, 3), social: [...new Set(social)].slice(0, 3) };
}

// -- rewrite-with-images --
async function handleRewriteWithImages(
  content: string,
  context: any,
  apiKey: string,
  cors: Record<string, string>,
) {
  const title = context?.title || '';
  const contextKeyphrase = context?.focusKeyphrase || '';

  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY') || '';
  const enrichmentData = await enrichWithPerplexity(title, content, PERPLEXITY_API_KEY);
  const enrichmentSection = enrichmentData
    ? `\n\nRESEARCH ENRICHMENT (verified facts and citations you MUST draw from):\n${enrichmentData}\n`
    : '';

  // Extract YouTube / social media URLs from source content
  const embedUrls = extractEmbedUrls(content);
  let embedSection = '';
  if (embedUrls.youtube.length > 0 || embedUrls.social.length > 0) {
    const parts: string[] = [];
    if (embedUrls.youtube.length > 0) {
      parts.push('YouTube videos (embed as responsive iframe):\n' + embedUrls.youtube.map((u: string, i: number) => `${i + 1}. ${u}`).join('\n'));
    }
    if (embedUrls.social.length > 0) {
      parts.push('Social media posts (embed as a clickable link with context):\n' + embedUrls.social.map((u: string, i: number) => `${i + 1}. ${u}`).join('\n'));
    }
    embedSection = `\n\nEMBEDDED MEDIA FROM SOURCE (MANDATORY - include these in the rewritten article):\n${parts.join('\n\n')}\n`;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  // Internal links: guarantee 5+
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
    ? `\nINTERNAL LINKS:\n- You MUST incorporate at least 3 internal links from the following list. Place them where they are contextually relevant. Use the exact markdown format provided - do NOT modify the URLs.\n- CRITICAL: Internal links MUST use plain markdown syntax [text](/path) - do NOT add target="_blank", do NOT add rel attributes, do NOT append ^ to internal links. Only external links get target="_blank".\n- Internal links must flow INLINE within sentences - never place them on their own line or as standalone blocks.\n- Available internal links:\n${availableLinks.join('\n')}\n`
    : '';

  // External links: pre-verify before passing to AI
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
            const timeout = setTimeout(() => controller.abort(), 1500);
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
        .limit(8);

      if (extLinks && extLinks.length > 0) {
        const seenDomains = new Set<string>();
        const dedupedLinks = extLinks.filter((link: any) => {
          if (seenDomains.has(link.domain)) return false;
          seenDomains.add(link.domain);
          return true;
        }).slice(0, 8);

        verifiedExtLinks = await verifyLinks(dedupedLinks);

        if (verifiedExtLinks.length < 2) {
          const { data: broadLinks } = await supabaseClient
            .from('external_links')
            .select('title, url, source_name, domain')
            .order('published_at', { ascending: false })
            .limit(12);

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

  // Step 1: Rewrite + get image suggestions in one AI call
  const rewriteSystemPrompt = `You are Scout, the senior editor at AIinASIA.com. You are a sharp, opinionated editorial voice covering AI across Asia-Pacific. Rewrite the article to be deeply informative, well-structured, and optimised for search. Use British English throughout. Maintain factual accuracy above all else.

CONTENT DEPTH (MANDATORY):
- The rewritten article MUST be at least 900 words. If the source material is thin, add genuine context, background, and implications - do not pad with waffle.
- Include a "By The Numbers" block near the top of the article: a short <ul> of 3-5 specific statistics or data points relevant to the topic. These MUST come from the original content or the Research Enrichment data below. Label it with <h3>By The Numbers</h3> immediately followed by the bullet list.
- Include a FAQ section at the END of the article (before the closing paragraph): 2-3 questions a reader would genuinely ask, with concise answers. Format as: <h3>Frequently Asked Questions</h3> followed by <h4>Question?</h4><p>Answer.</p> pairs. Questions should target common search queries related to the topic.

ASIA-PACIFIC ANGLE (MANDATORY - not optional):
- Every article MUST include a named Asia-Pacific section or clearly labelled callout. Use a <h2> like "What This Means for Asia" or "The Asia-Pacific Picture" or similar relevant heading.
- Reference at least one specific country, company, regulator, or market dynamic by name. Use the Research Enrichment data for this if the original article lacks it.
- CRITICAL: Only reference REAL, verifiable facts. Do NOT fabricate statistics, company names, quotes, or research. Better a shorter Asia section with real data than a longer one with invented content.

QUOTES AND BLOCKQUOTES:
- You MUST include at least 2 <blockquote> elements.
- Blockquotes must ONLY contain: (a) direct quotes from named individuals that appear in the original source content, (b) verified quotes from the Research Enrichment data attributed to a named individual, or (c) a striking statistic or data point with its original research source. NEVER fabricate a quote. NEVER use a media outlet, publication, or website as the attribution - only real named people.
- Format: <blockquote>"Quote text." - First Name Last Name, Title, Organisation</blockquote> or <blockquote>Statistic or data point - Original Research Organisation</blockquote>

KEYWORD OPTIMISATION:
- Use the focus keyphrase naturally 4-6 times throughout the article (including in at least one H2).
- Use each keyphrase synonym 1-2 times each.
- Do not force keywords awkwardly - natural usage only.

LINKS:
- Do NOT preserve any links from the original pasted content. Never link back to the domain or source from which the original article came.
- ALL external links must use the exact URLs provided in the external links list or the PERPLEXITY CITATION URLS section of the Research Enrichment block. Do NOT invent or modify URLs.
- MANDATORY (SEO-CRITICAL): Every article MUST contain at least one external link from the PERPLEXITY CITATION URLS list, formatted as <a href="URL" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>. Prioritise tier-1 outlets (Reuters, AP, Bloomberg, Financial Times, Nikkei Asia, South China Morning Post, The Straits Times, or equivalent). Weave it naturally into a sentence as a supporting reference. This is non-negotiable for SEO ranking.
- MANDATORY: Any statistic, data point, or named research report cited in the article MUST have an inline external link using target="_blank" rel="noopener noreferrer". Use the closest matching URL from the Perplexity citations or external links list. Never leave a cited statistic or named report unlinked.
- ALL internal links must use the exact markdown paths provided (e.g. [text](/category/slug)). Do NOT invent or modify paths. Do NOT add target="_blank" or rel attributes to internal links - they open in the same tab. Do NOT append ^ to internal links.
- Anchor text for internal links must be descriptive and contextual. Never use "click here", "read more", "this article", or the raw article title as the entire anchor.
${internalLinksInstruction}${externalLinksSection}${enrichmentSection}${embedSection}

EMBEDDED MEDIA (MANDATORY if present):
- If the EMBEDDED MEDIA FROM SOURCE section is provided below, you MUST include every listed URL in the rewritten article.
- YouTube videos: embed as a responsive iframe: <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5em 0;"><iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>
- Twitter/X posts: embed as a styled link: <blockquote><a href="TWEET_URL" target="_blank" rel="noopener noreferrer">View the original post on X</a></blockquote> with a sentence of context before it.
- Instagram, TikTok, LinkedIn posts: embed as a styled external link with context.
- NEVER strip or ignore social media URLs from the source material. They are editorial assets.

MID-ARTICLE IMAGE PLACEHOLDER:
- Place exactly one IMAGE_PLACEHOLDER_HERE on its own line roughly 40-60% through the content.
- On the line immediately after IMAGE_PLACEHOLDER_HERE, write a short descriptive caption for the image wrapped in a figcaption tag: <figcaption>Caption text here, no longer than 15 words.</figcaption>
- Do NOT write markdown image syntax or full <figure> tags - just IMAGE_PLACEHOLDER_HERE followed by the <figcaption> on the next line.

FORMATTING RULES (ALL MANDATORY):
- Output clean HTML only. No markdown syntax whatsoever.
- NEVER use em dashes. Replace any em dash construction with a full stop, a comma, or rewrite the sentence. This is a hard rule - no exceptions.
- Use: <h2> for main sections (4-6 sections), <h3> for subheadings, <h4> for FAQ questions
- NEVER use <h1> tags. The article title is already rendered as H1 by the page template.
- The article MUST open with a <h2> subheading as its very first element - never start with a <p> tag. The opening <h2> should frame the story angle, not restate the headline. Think of it as a deck head.
- <p> for paragraphs - 2-4 sentences each, NEVER more than 5 sentences
- <strong> for bold (minimum 6 per article), <em> for italic
- <ul><li> and <ol><li> for lists - you MUST include at least 2 separate list blocks in the article
- <a href="..."> for links (external links: target="_blank" rel="noopener noreferrer")
- <blockquote> for quotes and data callouts
- MAXIMUM 2 consecutive paragraphs before a visual break (subheading, blockquote, list, or callout).
- Where the article compares options, tools, approaches, or time periods: use a <table> with <thead> and <tbody>.

CLOSING SECTION (MANDATORY - two distinct elements, rendered separately):

Element 1 - Scout's editorial position, wrapped in a styled callout div:
<div class="scout-view"><strong>The AIinASIA View:</strong> 2 sentences expressing AIinASIA's clear, opinionated view on the topic. Confident and specific, not hedged. Scout has a point of view.</div>

Element 2 - Reader invitation, as a plain <p> tag immediately after the div:
<p>1 sentence ending with a specific, direct question using "you" or "your", followed by "Drop your take in the comments below."</p>

Do NOT use "Final Thoughts", "Conclusion", or any closing heading. The two elements must always appear together at the end, in order.

CRITICAL JSON FORMATTING RULE: Your entire response must be a valid JSON object. The "rewrittenContent" field contains HTML with quotes - you MUST escape all double quotes inside HTML attribute values as \\". For example: <a href=\\"https://example.com\\" target=\\"_blank\\">. This is essential for JSON validity.

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
  "metaDescription": "Write a COMPLETE sentence under 155 characters. Never end mid-sentence. Include the focus keyphrase. Make it compelling enough to click.",
  "focusKeyphrase": "Primary keyword phrase, 2-4 words",
  "keyphraseSynonyms": "3-5 comma-separated synonym phrases",
  "aiTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "heroImageDescription": "Specific photo brief as if directing a photographer on location. BANNED: people using computers, looking at screens, typing, sitting at desks, generic office settings, abstract technology scenes. Describe a concrete real-world scene.",
  "heroImageAlt": "Short alt text under 45 chars. Include focus keyphrase if natural.",
  "heroImageCaption": "One sentence caption for the hero image. Max 20 words.",
  "midImageDescription": "Specific photo brief for a supporting in-article image showing a DIFFERENT subject or angle from the hero.",
  "midImageAlt": "Short alt text under 45 chars"
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

  let heroImageCaption: string = '';

  // -- Parse JSON response with robust fallback --
  let parsed: any = {};
  try {
    const cleaned = rawResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
    console.log('JSON parse succeeded');
  } catch (parseErr) {
    console.warn('Full JSON parse failed, attempting field-by-field extraction:', parseErr);
    
    // Helper: extract a simple string field from raw JSON text
    const extractField = (field: string, raw: string): string => {
      const regex = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
      const match = raw.match(regex);
      if (match?.[1]) {
        return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      return '';
    };
    
    // Helper: extract an array field from raw JSON text
    const extractArray = (field: string, raw: string): string[] => {
      const regex = new RegExp(`"${field}"\\s*:\\s*\\[((?:[^\\]]|\\n)*?)\\]`);
      const match = raw.match(regex);
      if (match?.[1]) {
        try {
          return JSON.parse(`[${match[1]}]`);
        } catch { return []; }
      }
      return [];
    };

    // Extract rewrittenContent using character-walking approach (handles unescaped content)
    let fallbackContent = rawResult;
    try {
      const contentStart = rawResult.indexOf('"rewrittenContent"');
      if (contentStart > -1) {
        const colonPos = rawResult.indexOf(':', contentStart + 18);
        const valueStart = rawResult.indexOf('"', colonPos + 1);
        if (valueStart > -1) {
          let i = valueStart + 1;
          while (i < rawResult.length) {
            if (rawResult[i] === '\\') { i += 2; continue; }
            if (rawResult[i] === '"') break;
            i++;
          }
          fallbackContent = rawResult.substring(valueStart + 1, i)
            .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          console.log('Fallback content extraction succeeded, length:', fallbackContent.length);
        }
      }
    } catch { /* use rawResult */ }

    parsed = {
      rewrittenContent: fallbackContent,
      headline: extractField('headline', rawResult),
      excerpt: extractField('excerpt', rawResult),
      tldr: extractArray('tldr', rawResult),
      whoShouldPayAttention: extractField('whoShouldPayAttention', rawResult),
      whatChangesNext: extractField('whatChangesNext', rawResult),
      category: extractField('category', rawResult),
      seoTitle: extractField('seoTitle', rawResult),
      metaTitle: extractField('metaTitle', rawResult),
      metaDescription: extractField('metaDescription', rawResult),
      focusKeyphrase: extractField('focusKeyphrase', rawResult),
      keyphraseSynonyms: extractField('keyphraseSynonyms', rawResult),
      heroImageDescription: extractField('heroImageDescription', rawResult),
      heroImageAlt: extractField('heroImageAlt', rawResult),
      heroImageCaption: extractField('heroImageCaption', rawResult),
      midImageDescription: extractField('midImageDescription', rawResult),
      midImageAlt: extractField('midImageAlt', rawResult),
      aiTags: extractArray('aiTags', rawResult),
    };
    console.log('Fallback field extraction results:', {
      hasContent: !!parsed.rewrittenContent && parsed.rewrittenContent.length > 100,
      contentLength: (parsed.rewrittenContent || '').length,
      hasHeadline: !!parsed.headline,
      hasExcerpt: !!parsed.excerpt,
      hasTldr: parsed.tldr?.length > 0,
      hasHeroDesc: !!parsed.heroImageDescription,
      hasMidDesc: !!parsed.midImageDescription,
      hasSeoTitle: !!parsed.seoTitle,
      hasFocusKeyphrase: !!parsed.focusKeyphrase,
    });
  }

  // Assign variables from parsed (works for both full parse and fallback extraction)
  const rewrittenContent = parsed.rewrittenContent || rawResult;
  const heroImageDescription = parsed.heroImageDescription || '';
  const heroImageAltText = (parsed.heroImageAlt || '').slice(0, 125);
  heroImageCaption = parsed.heroImageCaption || '';
  const midImageDescription = parsed.midImageDescription || '';
  const midImageAltText = (parsed.midImageAlt || '').slice(0, 125);

  console.log('Final parsed fields:', {
    hasHeadline: !!parsed.headline,
    hasExcerpt: !!parsed.excerpt,
    hasTldr: Array.isArray(parsed.tldr) && parsed.tldr.length > 0,
    hasCategory: !!parsed.category,
    hasSeoTitle: !!parsed.seoTitle,
    hasHeroDesc: !!heroImageDescription,
    hasMidDesc: !!midImageDescription,
    contentLength: rewrittenContent.length,
  });

  let finalContent = rewrittenContent;

  // Direct JSON field extraction
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

  // Hard strip: remove all em dashes regardless of what the AI output
  finalContent = finalContent
    .replace(/\u2014/g, ',')   // em dash -> comma
    .replace(/\u2013/g, ',')   // en dash -> comma
    .replace(/\u2015/g, ',')   // horizontal bar -> comma
    .replace(/ \u2014 /g, '. ')
    .replace(/ \u2013 /g, ', ');

  // Validate external links exist (SEO requirement)
  const hasExternalLink = /target="_blank"/.test(finalContent) || /target=\\"_blank\\"/.test(finalContent);
  if (!hasExternalLink) {
    console.warn('SEO WARNING: Rewritten article contains ZERO external links. This harms SEO ranking.');
  }

  // Look up category ID from database
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

  // Step 3: Generate images using focusKeyphrase for filenames
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const imageGatewayUrl = LOVABLE_API_KEY
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const imageGatewayKey = LOVABLE_API_KEY || apiKey;

    const extractBase64FromResponse = (data: any): string | null => {
      // Format 1: Lovable AI Gateway — images array
      const gatewayUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (gatewayUrl) return gatewayUrl;

      // Format 2: Google direct API — content parts with inline_data
      const parts = data.choices?.[0]?.message?.content;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.type === 'image_url' && part?.image_url?.url) return part.image_url.url;
          if (part?.inline_data?.data && part?.inline_data?.mime_type) {
            return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          }
        }
      }

      return null;
    };

    const generateHeroImage = async (description: string): Promise<{ url: string }> => {
      const timestamp = Date.now();
      console.log('Generating hero image via', LOVABLE_API_KEY ? 'Lovable AI Gateway' : 'Google direct API');
      const imgResponse = await fetch(imageGatewayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${imageGatewayKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [
            { role: 'user', content: `Editorial magazine cover photograph. ${description}

COMPOSITION: Wide establishing shot. Strong visual hierarchy. Subject positioned right-of-centre or upper third, leaving clear negative space on the left for a title overlay. Foreground element to add depth.

LIGHTING: Cinematic. Either soft directional window light with gentle shadows, warm golden-hour outdoor light, or dramatic studio lighting with clear key and fill. Rich contrast without crushing blacks.

STYLE: Photorealistic, shot on full-frame camera, 35mm lens equivalent. Shallow depth of field with sharp subject and softly blurred background. Color grading: warm, slightly desaturated mid-tones with rich saturated highlights. The mood should feel premium, considered, and human.

PEOPLE: Where the topic involves people, show real human subjects. Diverse, Asian representation prioritised for Asia-Pacific topics. Candid or lightly directed poses, never stiff stock-photo poses.

HARD RULES: No text, logos, watermarks, or UI elements in the image. No robot hands, glowing brains, neural networks, binary code, circuit boards, or any AI visual cliches. No flat design or illustration. No dark or black backgrounds. ABSOLUTELY NO people sitting at computers, looking at screens, or typing on laptops - this is the most important rule. No generic office or tech scenes. No stock-photo poses. The image must show the specific real-world subject of this article: a place, an industry, a moment, an object, or people doing something directly related to the story. If in doubt, show an environment rather than a person.` }
          ],
          modalities: ['image', 'text'],
        }),
      });
      if (!imgResponse.ok) {
        const errBody = await imgResponse.text();
        console.error('Hero image API error:', imgResponse.status, errBody);
        throw new Error(`Hero image generation failed [${imgResponse.status}]`);
      }
      const imgData = await imgResponse.json();
      const base64Url = extractBase64FromResponse(imgData);
      if (!base64Url) {
        console.error('Hero image: no image in response. Keys:', JSON.stringify(Object.keys(imgData?.choices?.[0]?.message || {})));
        throw new Error('No image in response');
      }
      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const filePath = `content/${slugifiedKeyphrase}-hero-${timestamp}.png`;
      const { error: uploadError } = await supabase.storage.from('article-images').upload(filePath, binaryData, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(filePath);
      console.log('Hero image generated:', publicUrl);
      return { url: publicUrl };
    };

    const generateMidImage = async (description: string): Promise<{ url: string }> => {
      const timestamp = Date.now();
      const imgResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          messages: [
            { role: 'user', content: `Editorial in-article photograph. ${description}

COMPOSITION: Tighter than a cover shot, medium or close-up framing. Centred or symmetrical composition is fine here. Can focus on a specific detail, object, moment, or person that supports the article narrative. Does NOT need to leave space for text overlay.

LIGHTING: Natural and authentic. Soft diffused light, overcast outdoor, or warm interior ambient. Avoid dramatic studio lighting, this image should feel like a documentary or reportage photograph.

STYLE: Photorealistic, 50-85mm lens equivalent. Can have slightly more depth of field than the hero (more context in frame). Color grading: natural, slightly cooler tones than the hero to create visual contrast between the two images. The mood should feel informative and grounded.

PEOPLE: Where relevant, show people in action or mid-task, working, talking, interacting with technology or environment. Real and candid, not posed.

HARD RULES: No text, logos, watermarks, or UI elements. No AI visual cliches (robot hands, glowing brains, circuit boards, binary code). No flat design or illustration. No black backgrounds. Must be clearly related to the specific topic described, not a generic visual.` }
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

  // Step 4: Safety strip FIRST, then insert our images

  // Safety: strip markdown images with alt text over 50 chars (leaked AI prompts)
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

// -- validate-links --
async function handleValidateLinks(content: string, cors: Record<string, string>) {
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
