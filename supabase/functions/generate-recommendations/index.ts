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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get user's reading history
    const { data: readingHistory } = await supabase
      .from("reading_history")
      .select(`
        article_id,
        articles!inner (
          id,
          title,
          primary_category_id
        )
      `)
      .eq("user_id", user.id)
      .limit(20);

    if (!readingHistory || readingHistory.length === 0) {
      // New user - return trending articles
      const { data: trending } = await supabase
        .from("articles")
        .select("id, title, excerpt, slug, featured_image_url, reading_time_minutes, categories:primary_category_id(name, slug)")
        .eq("status", "published")
        .eq("is_trending", true)
        .limit(6);

      return new Response(
        JSON.stringify({ recommendations: trending || [], reason: "trending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get categories user reads
    const categoryIds = readingHistory
      .map((h: any) => h.articles?.primary_category_id)
      .filter(Boolean);

    // Use AI to generate smart recommendations
    if (LOVABLE_API_KEY) {
      const articleTitles = readingHistory
        .map((h: any) => h.articles?.title)
        .filter(Boolean)
        .slice(0, 10)
        .join(", ");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are an AI content recommendation engine. Analyze user reading patterns and suggest article topics."
            },
            {
              role: "user",
              content: `User has read these articles: ${articleTitles}. What 3-5 AI/tech article topics would they enjoy next? Return ONLY a comma-separated list of keywords.`
            }
          ]
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const keywords = aiData.choices[0]?.message?.content?.toLowerCase() || "";
        
        // Find articles matching AI suggestions
        const { data: aiRecommendations } = await supabase
          .from("articles")
          .select("id, title, excerpt, slug, featured_image_url, reading_time_minutes, categories:primary_category_id(name, slug)")
          .eq("status", "published")
          .or(`title.ilike.%${keywords}%,excerpt.ilike.%${keywords}%`)
          .not("id", "in", `(${readingHistory.map((h: any) => h.article_id).join(",")})`)
          .limit(6);

        if (aiRecommendations && aiRecommendations.length > 0) {
          // Store recommendations
          await supabase.from("article_recommendations").insert(
            aiRecommendations.map(rec => ({
              user_id: user.id,
              article_id: rec.id,
              score: 0.9,
              reason: "ai_personalized"
            }))
          );

          return new Response(
            JSON.stringify({ recommendations: aiRecommendations, reason: "ai_personalized" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fallback: category-based recommendations
    const { data: categoryRecs } = await supabase
      .from("articles")
      .select("id, title, excerpt, slug, featured_image_url, reading_time_minutes, categories:primary_category_id(name, slug)")
      .eq("status", "published")
      .in("primary_category_id", categoryIds)
      .not("id", "in", `(${readingHistory.map((h: any) => h.article_id).join(",")})`)
      .order("view_count", { ascending: false })
      .limit(6);

    return new Response(
      JSON.stringify({ recommendations: categoryRecs || [], reason: "category_based" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
