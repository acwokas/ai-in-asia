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

    console.log("Starting auto-schedule comments check...");

    // Get all published articles
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (articlesError) {
      console.error("Error fetching articles:", articlesError);
      throw articlesError;
    }

    console.log(`Found ${articles.length} published articles`);

    // Check which articles need comments scheduled
    const articlesNeedingComments = [];
    
    for (const article of articles) {
      // Check if article has any comments
      const { count: commentCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article.id);

      // Check if article has any pending comments
      const { count: pendingCount } = await supabase
        .from("pending_comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article.id);

      if (commentCount === 0 && pendingCount === 0) {
        articlesNeedingComments.push(article);
      }
    }

    console.log(`Found ${articlesNeedingComments.length} articles needing comments`);

    if (articlesNeedingComments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "All articles already have comments or pending comments",
          totalArticles: articles.length,
          articlesScheduled: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Schedule comments for articles that need them (in batches to avoid timeouts)
    const batchSize = 10;
    let scheduled = 0;
    const errors: Array<{ id: string; slug: string; error: string }> = [];

    for (let i = 0; i < articlesNeedingComments.length; i += batchSize) {
      const batch = articlesNeedingComments.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(article => 
          supabase.functions.invoke("generate-article-comments", {
            body: { articleId: article.id, batchMode: true }
          })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          scheduled++;
          console.log(`Scheduled comments for: ${batch[idx].title}`);
        } else {
          errors.push({
            id: batch[idx].id,
            slug: batch[idx].title,
            error: result.reason
          });
          console.error(`Failed to schedule for ${batch[idx].title}:`, result.reason);
        }
      });

      // Small delay between batches
      if (i + batchSize < articlesNeedingComments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled comments for ${scheduled} articles`,
        totalArticles: articles.length,
        articlesNeeded: articlesNeedingComments.length,
        articlesScheduled: scheduled,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
