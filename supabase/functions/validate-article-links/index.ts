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

// Use OpenAI to find alternative sources and rewrite
async function findAlternativeAndRewrite(
  brokenLink: { url: string; anchorText: string; context: string },
  openAIApiKey: string
): Promise<{ alternativeUrl: string; alternativeSource: string; rewrittenText: string } | null> {
  try {
    console.log(`Finding alternative for: ${brokenLink.anchorText} (${brokenLink.url})`);
    
    const systemPrompt = `You are a senior editor at a leading AI news publication focused on Asia. Your task is to find alternative sources for broken links from tier-1 publications.

TIER 1 SOURCES (prefer these in order):
${TIER1_SOURCES.join(', ')}

CRITICAL RULES:
1. ONLY suggest URLs from well-known, established publications
2. The alternative MUST cover the same topic/story as the original
3. Prefer recent articles (2024-2025) from tier-1 sources
4. If you cannot find a suitable alternative, say "NO_ALTERNATIVE"
5. The rewritten text should flow naturally with the original context`;

    const userPrompt = `A broken link needs to be replaced:

Original anchor text: "${brokenLink.anchorText}"
Broken URL: ${brokenLink.url}
Surrounding context: "${brokenLink.context}"

Find an alternative from a tier-1 source and provide a rewrite. Respond using the suggest_alternative function.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_alternative",
              description: "Suggest an alternative URL and rewritten text for a broken link",
              parameters: {
                type: "object",
                properties: {
                  alternativeUrl: { 
                    type: "string",
                    description: "The full URL of the alternative article from a tier-1 source. Use 'NO_ALTERNATIVE' if none found."
                  },
                  alternativeSource: { 
                    type: "string",
                    description: "The name of the publication (e.g., 'Reuters', 'BBC', 'TechCrunch')"
                  },
                  rewrittenText: { 
                    type: "string",
                    description: "The rewritten anchor text that fits the context naturally"
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence that this alternative covers the same topic"
                  }
                },
                required: ["alternativeUrl", "alternativeSource", "rewrittenText", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_alternative" } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'suggest_alternative') {
      console.log('No tool call in response');
      return null;
    }

    const args = JSON.parse(toolCall.function.arguments);
    
    if (args.alternativeUrl === 'NO_ALTERNATIVE' || args.confidence === 'low') {
      console.log('No suitable alternative found or low confidence');
      return null;
    }

    console.log(`Found alternative: ${args.alternativeSource} - ${args.alternativeUrl}`);
    
    return {
      alternativeUrl: args.alternativeUrl,
      alternativeSource: args.alternativeSource,
      rewrittenText: args.rewrittenText
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
