import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { articleIds } = await req.json();

    console.log("Generating tags for articles:", articleIds);

    // Fetch articles
    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, slug, top_list_items")
      .in("id", articleIds);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No articles found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let updated = 0;

    for (const article of articles) {
      console.log(`Processing article: ${article.slug}`);
      
      if (!article.top_list_items || !Array.isArray(article.top_list_items)) {
        console.log(`Skipping ${article.slug} - no top_list_items`);
        continue;
      }

      let itemsUpdated = false;
      const updatedItems = article.top_list_items.map((item: any) => {
        // Only generate tags if missing or empty
        if (!item.tags || item.tags.length === 0) {
          if (item.title) {
            // Auto-generate tags from title
            const words = item.title
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .split(/\s+/)
              .filter((word: string) => word.length > 3);
            const uniqueWords = [...new Set(words)].slice(0, 5);
            
            if (uniqueWords.length > 0) {
              console.log(`Generated tags for "${item.title}":`, uniqueWords);
              itemsUpdated = true;
              return { ...item, tags: uniqueWords };
            }
          }
        }
        return item;
      });

      if (itemsUpdated) {
        const { error: updateError } = await supabase
          .from("articles")
          .update({ top_list_items: updatedItems })
          .eq("id", article.id);

        if (updateError) {
          console.error(`Failed to update article ${article.slug}:`, updateError);
        } else {
          console.log(`Successfully updated article ${article.slug}`);
          updated++;
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        updated,
        message: `Processed ${processed} articles, updated ${updated} with missing tags`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
