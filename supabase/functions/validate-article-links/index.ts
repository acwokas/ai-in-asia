import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkValidationResult {
  url: string;
  anchorText: string;
  isValid: boolean;
  status?: number;
  error?: string;
  type: 'internal' | 'external';
  // AI-generated fix suggestions
  suggestedFix?: {
    alternativeUrl: string;
    alternativeSource: string;
    rewrittenText: string;
    originalContext: string;
  };
}

// Tier 1 news sources for AI to suggest alternatives from
const TIER1_SOURCES = [
  "Reuters", "BBC", "The New York Times", "The Wall Street Journal", "The Guardian",
  "Associated Press", "Bloomberg", "Financial Times", "The Economist", "CNBC",
  "TechCrunch", "Wired", "The Verge", "Ars Technica", "MIT Technology Review",
  "Nature", "Science", "South China Morning Post", "Nikkei Asia", "The Straits Times"
];

// Validate if a URL is accessible
async function validateUrl(url: string): Promise<{ isValid: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIinASIA LinkChecker/1.0; +https://aiinasia.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    // Some servers don't support HEAD, try GET
    if (response.status === 405 || response.status === 403) {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 8000);
      
      response = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AIinASIA LinkChecker/1.0; +https://aiinasia.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      
      clearTimeout(getTimeoutId);
    }
    
    const isValid = response.ok || response.status === 301 || response.status === 302 || response.status === 308;
    
    return {
      isValid,
      status: response.status,
      error: isValid ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return { isValid: false, error: 'Request timed out' };
    }
    
    if (errorMessage.includes('dns') || errorMessage.includes('resolve')) {
      return { isValid: false, error: 'Domain not found' };
    }
    
    return { isValid: false, error: errorMessage };
  }
}

// Extract all links from markdown content
function extractLinks(content: string): { url: string; anchorText: string; type: 'internal' | 'external'; context: string }[] {
  const links: { url: string; anchorText: string; type: 'internal' | 'external'; context: string }[] = [];
  
  // Match markdown links: [text](url) or [text](url)^
  const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)\^?/g;
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    const anchorText = match[1];
    const url = match[2];
    const matchIndex = match.index;
    
    // Get surrounding context (100 chars before and after)
    const contextStart = Math.max(0, matchIndex - 100);
    const contextEnd = Math.min(content.length, matchIndex + match[0].length + 100);
    const context = content.slice(contextStart, contextEnd);
    
    const isExternal = url.startsWith('http://') || url.startsWith('https://');
    const isInternal = url.startsWith('/');
    
    if (isExternal) {
      if (!url.includes('aiinasia.com')) {
        links.push({ url, anchorText, type: 'external', context });
      }
    } else if (isInternal) {
      links.push({ url, anchorText, type: 'internal', context });
    }
  }
  
  // Also match plain URLs
  const plainUrlPattern = /(?<!\[)(?<!\()(https?:\/\/[^\s\)]+)(?!\))/g;
  while ((match = plainUrlPattern.exec(content)) !== null) {
    const url = match[1];
    if (!url.includes('aiinasia.com')) {
      if (!links.some(l => l.url === url)) {
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(content.length, match.index + url.length + 100);
        const context = content.slice(contextStart, contextEnd);
        links.push({ url, anchorText: url, type: 'external', context });
      }
    }
  }
  
  return links;
}

// Use OpenAI with web search to find alternative sources
async function findAlternativeAndRewrite(
  brokenLink: { url: string; anchorText: string; context: string },
  openAIApiKey: string
): Promise<{ alternativeUrl: string; alternativeSource: string; rewrittenText: string } | null> {
  try {
    console.log(`Finding alternative for: ${brokenLink.anchorText} (${brokenLink.url})`);
    
    // Use Lovable AI gateway with web search capability
    const systemPrompt = `You are a research assistant helping to find replacement URLs for broken links. 

CRITICAL RULES:
1. Use web search to find REAL, WORKING articles on the same topic
2. NEVER fabricate or guess URLs - only return URLs you have verified exist
3. Prefer tier-1 sources: Reuters, BBC, NYT, WSJ, Guardian, Bloomberg, TechCrunch, Wired, The Verge, MIT Tech Review, SCMP, Nikkei Asia
4. The alternative must cover the SAME topic as the original broken link
5. If you cannot find a verified working URL, respond with NO_ALTERNATIVE

Return a JSON object with:
- alternativeUrl: the verified working URL (or "NO_ALTERNATIVE")
- alternativeSource: publication name
- rewrittenText: natural anchor text for the link`;

    const userPrompt = `Find a working replacement for this broken link:

Original anchor text: "${brokenLink.anchorText}"
Broken URL: ${brokenLink.url}
Context: "${brokenLink.context.slice(0, 200)}"

Search the web for a current, working article on the same topic from a reputable source. Return ONLY verified URLs.`;

    // Use Lovable AI gateway which supports web search
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        web_search_options: {
          search_context_size: "medium"
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('AI response:', content);

    // Parse the response - try to extract JSON or structured data
    let alternativeUrl = '';
    let alternativeSource = '';
    let rewrittenText = '';

    // Try to parse as JSON first
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        alternativeUrl = parsed.alternativeUrl || parsed.url || '';
        alternativeSource = parsed.alternativeSource || parsed.source || '';
        rewrittenText = parsed.rewrittenText || parsed.text || brokenLink.anchorText;
      }
    } catch {
      // Try to extract URL from plain text
      const urlMatch = content.match(/https?:\/\/[^\s\]\)\"\'<>]+/);
      if (urlMatch && !content.includes('NO_ALTERNATIVE')) {
        alternativeUrl = urlMatch[0].replace(/[.,;:!?]+$/, ''); // Remove trailing punctuation
        // Try to extract source name
        const sourceMatch = content.match(/(?:from|source|by)\s+([A-Z][a-zA-Z\s&]+)/i);
        alternativeSource = sourceMatch ? sourceMatch[1].trim() : 'Unknown Source';
        rewrittenText = brokenLink.anchorText;
      }
    }

    if (!alternativeUrl || alternativeUrl === 'NO_ALTERNATIVE' || alternativeUrl.includes('NO_ALTERNATIVE')) {
      console.log('No suitable alternative found');
      return null;
    }

    // CRITICAL: Validate the suggested URL actually works before returning
    console.log(`Validating suggested URL: ${alternativeUrl}`);
    const validation = await validateUrl(alternativeUrl);
    
    if (!validation.isValid) {
      console.log(`Suggested URL is also broken (${validation.status || validation.error}), rejecting`);
      return null;
    }

    console.log(`Found verified alternative: ${alternativeSource} - ${alternativeUrl}`);
    
    return {
      alternativeUrl,
      alternativeSource,
      rewrittenText
    };
  } catch (error) {
    console.error('Error finding alternative:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, checkExternal = true, checkInternal = false, suggestFixes = false } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (suggestFixes && !openAIApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key required for fix suggestions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert content to string if needed
    let contentString = "";
    if (typeof content === "string") {
      contentString = content;
    } else if (Array.isArray(content)) {
      contentString = content.map((block: any) => block.content || "").join("\n\n");
    } else if (content && typeof content === "object") {
      contentString = JSON.stringify(content);
    }

    // Extract links
    const links = extractLinks(contentString);
    console.log(`Found ${links.length} links to validate`);

    const results: LinkValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    // Validate external links
    const externalLinks = links.filter(l => l.type === 'external');
    const internalLinks = links.filter(l => l.type === 'internal');

    if (checkExternal && externalLinks.length > 0) {
      console.log(`Validating ${externalLinks.length} external links...`);
      
      // Process in batches
      const batchSize = 5;
      for (let i = 0; i < externalLinks.length; i += batchSize) {
        const batch = externalLinks.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (link) => {
            const validation = await validateUrl(link.url);
            
            if (validation.isValid) {
              validCount++;
            } else {
              invalidCount++;
            }
            
            const result: LinkValidationResult = {
              url: link.url,
              anchorText: link.anchorText,
              isValid: validation.isValid,
              status: validation.status,
              error: validation.error,
              type: 'external' as const
            };

            // If link is broken and we should suggest fixes, use AI
            if (!validation.isValid && suggestFixes && openAIApiKey) {
              const suggestion = await findAlternativeAndRewrite(
                { url: link.url, anchorText: link.anchorText, context: link.context },
                openAIApiKey
              );
              
              if (suggestion) {
                result.suggestedFix = {
                  alternativeUrl: suggestion.alternativeUrl,
                  alternativeSource: suggestion.alternativeSource,
                  rewrittenText: suggestion.rewrittenText,
                  originalContext: link.context
                };
              }
            }
            
            return result;
          })
        );
        
        results.push(...batchResults);
        
        // Delay between batches
        if (i + batchSize < externalLinks.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    // For internal links
    if (checkInternal) {
      for (const link of internalLinks) {
        results.push({
          url: link.url,
          anchorText: link.anchorText,
          isValid: true,
          type: 'internal'
        });
      }
    }

    const brokenLinks = results.filter(r => !r.isValid);
    const fixableLinks = brokenLinks.filter(r => r.suggestedFix);

    const response = {
      success: true,
      summary: {
        totalLinks: links.length,
        externalLinks: externalLinks.length,
        internalLinks: internalLinks.length,
        validLinks: validCount,
        invalidLinks: invalidCount,
        fixableLinks: fixableLinks.length,
        checkedExternal: checkExternal,
        checkedInternal: checkInternal,
        suggestedFixes: suggestFixes
      },
      results: results.sort((a, b) => {
        if (a.isValid !== b.isValid) return a.isValid ? 1 : -1;
        return 0;
      }),
      brokenLinks,
      fixableLinks
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in validate-article-links:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
