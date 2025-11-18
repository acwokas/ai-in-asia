import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleIds, dryRun = false } = await req.json();

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Article IDs array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size to prevent timeouts (edge functions have ~150s limit)
    const MAX_BATCH_SIZE = 50;
    if (articleIds.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: `Batch size too large. Maximum ${MAX_BATCH_SIZE} articles per request. Please process in smaller batches.`,
          maxBatchSize: MAX_BATCH_SIZE,
          receivedCount: articleIds.length
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published articles for reference
    const { data: allArticles, error: allArticlesError } = await supabase
      .from("articles")
      .select(`
        id, 
        title, 
        slug, 
        excerpt,
        primary_category_id,
        categories!articles_primary_category_id_fkey (slug)
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100);

    if (allArticlesError) throw allArticlesError;

    const articlesList = allArticles?.map(a => {
      const categorySlug = (a.categories as any)?.slug || 'news';
      return `- ${a.title} (/${categorySlug}/${a.slug})`;
    }).join("\n") || "";

    const results: any[] = [];
    let processed = 0;
    let updated = 0;
    let failed = 0;

    console.log(`Processing ${articleIds.length} articles...`);

    for (const articleId of articleIds) {
      try {
        // Fetch the article
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .select("id, title, slug, content, excerpt")
          .eq("id", articleId)
          .single();

        if (articleError) throw articleError;
        if (!article) continue;

        // Convert content to string
        let contentString = "";
        if (typeof article.content === "string") {
          contentString = article.content;
        } else if (Array.isArray(article.content)) {
          contentString = article.content.map((block: any) => block.content || "").join("\n\n");
        } else if (article.content && typeof article.content === "object") {
          contentString = JSON.stringify(article.content);
        }

        // Check if article already has links
        const hasInternalLinks = /\[([^\]]+)\]\((\/[^\)]+)\)/.test(contentString);
        const hasExternalLinks = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/.test(contentString);

        if (hasInternalLinks && hasExternalLinks) {
          console.log(`Article ${article.slug} already has links, skipping`);
          results.push({
            articleId: article.id,
            title: article.title,
            status: "skipped",
            reason: "Already has internal and external links"
          });
          processed++;
          continue;
        }

        // Use AI to suggest where to add links
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an SEO expert. Add internal and external links to existing article content.

CRITICAL RULES:
- Add 2-4 internal links from our article list using natural anchor text
- Add at least 1 authoritative external link (research papers, official reports, major publications)
- External links MUST use format: [text](url)^ to open in new tabs
- Internal links MUST use EXACT URL from list including /category/slug format: [text](/category/article-slug)
- NEVER use [text](/article-slug) format - always include the category
- Only modify the content to add links - preserve all existing text, formatting, headings, paragraphs
- Make anchor text natural and contextual
- Place links where they genuinely add value

AVAILABLE ARTICLES:
${articlesList}

Return ONLY the updated content with links added. Do not change any other aspect of the article.`,
              },
              {
                role: "user",
                content: `Add relevant internal and external links to this article:\n\nTitle: ${article.title}\n\nContent:\n${contentString.substring(0, 8000)}`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI gateway error:", aiResponse.status, errorText);
          
          results.push({
            articleId: article.id,
            title: article.title,
            status: "failed",
            error: `AI gateway error: ${aiResponse.status}`
          });
          failed++;
          processed++;
          continue;
        }

        const aiData = await aiResponse.json();
        const updatedContent = aiData.choices?.[0]?.message?.content;

        if (!updatedContent) {
          results.push({
            articleId: article.id,
            title: article.title,
            status: "failed",
            error: "No content generated from AI"
          });
          failed++;
          processed++;
          continue;
        }

        // Update the article if not a dry run
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from("articles")
            .update({ content: updatedContent })
            .eq("id", article.id);

          if (updateError) {
            results.push({
              articleId: article.id,
              title: article.title,
              status: "failed",
              error: updateError.message
            });
            failed++;
          } else {
            results.push({
              articleId: article.id,
              title: article.title,
              status: "updated",
              preview: updatedContent.substring(0, 200) + "..."
            });
            updated++;
          }
        } else {
          results.push({
            articleId: article.id,
            title: article.title,
            status: "preview",
            preview: updatedContent.substring(0, 200) + "..."
          });
        }

        processed++;
        console.log(`Processed ${processed}/${articleIds.length}: ${article.title}`);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing article ${articleId}:`, error);
        
        // Try to fetch article title for better error reporting
        let articleTitle = 'Unknown';
        try {
          const { data: article } = await supabase
            .from("articles")
            .select("title")
            .eq("id", articleId)
            .single();
          if (article) articleTitle = article.title;
        } catch {}
        
        results.push({
          articleId,
          title: articleTitle,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
        failed++;
        processed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: articleIds.length,
          processed,
          updated,
          failed,
          skipped: results.filter(r => r.status === "skipped").length
        },
        results,
        dryRun
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in bulk-add-internal-links:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
