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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dryRun = true } = await req.json();

    console.log(`Starting broken link fix (dryRun: ${dryRun})...`);

    // Fetch all articles with their category slugs
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select(`
        id,
        title,
        slug,
        content,
        primary_category_id,
        categories!articles_primary_category_id_fkey (slug)
      `)
      .eq("status", "published");

    if (articlesError) throw articlesError;

    // Build a map of article slug -> full path
    const slugToPath = new Map();
    articles?.forEach((article: any) => {
      const categorySlug = article.categories?.slug || 'news';
      slugToPath.set(article.slug, `/${categorySlug}/${article.slug}`);
    });

    const results = [];
    let fixedCount = 0;

    for (const article of articles || []) {
      let contentString = "";
      if (typeof article.content === "string") {
        contentString = article.content;
      } else if (Array.isArray(article.content)) {
        contentString = article.content.map((block: any) => block.content || "").join("\n\n");
      } else if (article.content && typeof article.content === "object") {
        contentString = JSON.stringify(article.content);
      }

      // Find broken internal links (format: [text](/article-slug) without category)
      // Pattern matches /single-slug but NOT /category/article-slug
      const brokenLinkPattern = /\[([^\]]+)\]\(\/([a-z0-9-]+)\)(?!\/|\^)/g;
      const matches = [...contentString.matchAll(brokenLinkPattern)];

      if (matches.length === 0) continue;

      let updatedContent = contentString;
      let articleFixed = false;
      const fixedLinks = [];

      for (const match of matches) {
        const fullMatch = match[0];
        const linkText = match[1];
        const articleSlug = match[2];

        // Check if this slug exists in our map
        const correctPath = slugToPath.get(articleSlug);
        
        if (correctPath) {
          // Replace the broken link with the correct one
          const fixedLink = `[${linkText}](${correctPath})`;
          updatedContent = updatedContent.replace(fullMatch, fixedLink);
          articleFixed = true;
          fixedLinks.push({
            broken: fullMatch,
            fixed: fixedLink
          });
        }
      }

      if (articleFixed) {
        if (!dryRun) {
          // Update the article
          const { error: updateError } = await supabase
            .from("articles")
            .update({ content: updatedContent })
            .eq("id", article.id);

          if (updateError) {
            console.error(`Error updating article ${article.id}:`, updateError);
            results.push({
              id: article.id,
              title: article.title,
              status: "error",
              error: updateError.message
            });
            continue;
          }
        }

        fixedCount++;
        results.push({
          id: article.id,
          title: article.title,
          status: dryRun ? "would_fix" : "fixed",
          linksFixed: fixedLinks.length,
          examples: fixedLinks.slice(0, 3) // Show first 3 examples
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        articlesChecked: articles?.length || 0,
        articlesWithBrokenLinks: fixedCount,
        results,
        message: dryRun 
          ? `Found ${fixedCount} articles with broken links. Run with dryRun=false to fix them.`
          : `Fixed broken links in ${fixedCount} articles.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error fixing broken links:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});