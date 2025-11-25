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
    const { limit = 10, dryRun = true } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent published articles
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, slug, content")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (articlesError) throw articlesError;

    const results: any[] = [];
    let processed = 0;
    let updated = 0;
    let skipped = 0;

    console.log(`Processing ${articles?.length || 0} articles...`);

    for (const article of articles || []) {
      try {
        // Convert content to string
        let contentString = "";
        if (typeof article.content === "string") {
          contentString = article.content;
        } else if (Array.isArray(article.content)) {
          contentString = article.content.map((block: any) => block.content || "").join("\n\n");
        } else if (article.content && typeof article.content === "object") {
          contentString = JSON.stringify(article.content);
        }

        // Check if content has external links without the ^ indicator
        // Pattern: finds external links that don't already have ^ at the end
        const hasExternalLinksToFix = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)(?!\^)/.test(contentString);

        if (!hasExternalLinksToFix) {
          console.log(`Article ${article.slug} has no external links to fix, skipping`);
          results.push({
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            status: "skipped",
            reason: "No external links need fixing"
          });
          skipped++;
          processed++;
          continue;
        }

        // Fix external links by adding ^ indicator
        // This will convert [text](https://example.com) to [text](https://example.com)^
        // But only if it doesn't already have ^
        let updatedContent = contentString.replace(
          /\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)(?!\^)/g,
          '[$1]($2)^'
        );

        // Count how many links were fixed
        const originalMatches = contentString.match(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)(?!\^)/g);
        const fixedCount = originalMatches?.length || 0;

        if (fixedCount === 0) {
          results.push({
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            status: "skipped",
            reason: "No changes needed"
          });
          skipped++;
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
              slug: article.slug,
              status: "failed",
              error: updateError.message
            });
          } else {
            results.push({
              articleId: article.id,
              title: article.title,
              slug: article.slug,
              status: "updated",
              linksFixed: fixedCount,
              preview: updatedContent.substring(0, 300) + "..."
            });
            updated++;
          }
        } else {
          results.push({
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            status: "preview",
            linksFixed: fixedCount,
            preview: updatedContent.substring(0, 300) + "..."
          });
        }

        processed++;
        console.log(`Processed ${processed}/${articles.length}: ${article.title} - Fixed ${fixedCount} links`);

      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error);
        results.push({
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
        processed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: articles?.length || 0,
          processed,
          updated,
          skipped
        },
        results,
        dryRun
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fix-external-link-format:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
