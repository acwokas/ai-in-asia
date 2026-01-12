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
}

// Validate if a URL is accessible
async function validateUrl(url: string): Promise<{ isValid: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    // Try HEAD first, fallback to GET if HEAD fails
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
    
    // Check if it's a timeout
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return { isValid: false, error: 'Request timed out' };
    }
    
    // DNS or network errors
    if (errorMessage.includes('dns') || errorMessage.includes('resolve')) {
      return { isValid: false, error: 'Domain not found' };
    }
    
    return { isValid: false, error: errorMessage };
  }
}

// Extract all links from markdown content
function extractLinks(content: string): { url: string; anchorText: string; type: 'internal' | 'external' }[] {
  const links: { url: string; anchorText: string; type: 'internal' | 'external' }[] = [];
  
  // Match markdown links: [text](url) or [text](url)^
  const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)\^?/g;
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    const anchorText = match[1];
    const url = match[2];
    
    // Determine if internal or external
    const isExternal = url.startsWith('http://') || url.startsWith('https://');
    const isInternal = url.startsWith('/');
    
    if (isExternal) {
      // Skip aiinasia.com links as they're technically internal
      if (!url.includes('aiinasia.com')) {
        links.push({ url, anchorText, type: 'external' });
      }
    } else if (isInternal) {
      links.push({ url, anchorText, type: 'internal' });
    }
  }
  
  // Also match plain URLs that might be in the content
  const plainUrlPattern = /(?<!\[)(?<!\()(https?:\/\/[^\s\)]+)(?!\))/g;
  while ((match = plainUrlPattern.exec(content)) !== null) {
    const url = match[1];
    if (!url.includes('aiinasia.com')) {
      // Check if this URL is already captured
      if (!links.some(l => l.url === url)) {
        links.push({ url, anchorText: url, type: 'external' });
      }
    }
  }
  
  return links;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, checkExternal = true, checkInternal = false } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
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
      
      // Process in batches to avoid overwhelming servers
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
            
            return {
              url: link.url,
              anchorText: link.anchorText,
              isValid: validation.isValid,
              status: validation.status,
              error: validation.error,
              type: 'external' as const
            };
          })
        );
        
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < externalLinks.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // For internal links, we just report them (validation would require DB access)
    if (checkInternal) {
      for (const link of internalLinks) {
        results.push({
          url: link.url,
          anchorText: link.anchorText,
          isValid: true, // Assume valid - would need DB check for actual validation
          type: 'internal'
        });
      }
    }

    const response = {
      success: true,
      summary: {
        totalLinks: links.length,
        externalLinks: externalLinks.length,
        internalLinks: internalLinks.length,
        validLinks: validCount,
        invalidLinks: invalidCount,
        checkedExternal: checkExternal,
        checkedInternal: checkInternal
      },
      results: results.sort((a, b) => {
        // Sort invalid links first
        if (a.isValid !== b.isValid) return a.isValid ? 1 : -1;
        return 0;
      }),
      brokenLinks: results.filter(r => !r.isValid)
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
