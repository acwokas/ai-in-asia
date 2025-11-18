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
    const { articleId, action = "updated" } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const baseUrl = "https://aiinasia.com";

    // Fetch article details
    const { data: article } = await supabase
      .from("articles")
      .select(`
        slug,
        updated_at,
        primary_category_id,
        categories:primary_category_id!articles_primary_category_id_fkey(slug)
      `)
      .eq("id", articleId)
      .eq("status", "published")
      .single();

    if (!article || !article.categories) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categorySlug = (article.categories as any)?.slug || 'uncategorized';
    const articleUrl = `${baseUrl}/${categorySlug}/${article.slug}`;
    const results = {
      indexNow: { success: false, message: "" },
      googlePing: { success: false, message: "" },
      bingPing: { success: false, message: "" },
    };

    // 1. IndexNow Protocol (Bing, Yandex, and partners)
    try {
      const indexNowResponse = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: "aiinasia.com",
          key: "your-indexnow-key", // You'll need to generate and add this
          keyLocation: `${baseUrl}/indexnow-key.txt`,
          urlList: [articleUrl],
        }),
      });

      results.indexNow.success = indexNowResponse.ok;
      results.indexNow.message = indexNowResponse.ok 
        ? "Notified via IndexNow" 
        : `Failed: ${indexNowResponse.status}`;
    } catch (error) {
      results.indexNow.message = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }

    // 2. Google Sitemap Ping
    try {
      const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${baseUrl}/sitemap.xml`)}`;
      const googleResponse = await fetch(googlePingUrl);
      
      results.googlePing.success = googleResponse.ok;
      results.googlePing.message = googleResponse.ok 
        ? "Pinged Google sitemap" 
        : `Failed: ${googleResponse.status}`;
    } catch (error) {
      results.googlePing.message = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }

    // 3. Bing Sitemap Ping
    try {
      const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${baseUrl}/sitemap.xml`)}`;
      const bingResponse = await fetch(bingPingUrl);
      
      results.bingPing.success = bingResponse.ok;
      results.bingPing.message = bingResponse.ok 
        ? "Pinged Bing sitemap" 
        : `Failed: ${bingResponse.status}`;
    } catch (error) {
      results.bingPing.message = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }

    console.log("Search engine notification results:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        articleUrl,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error notifying search engines:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
