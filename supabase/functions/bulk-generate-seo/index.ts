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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    const gatewayUrl = LOVABLE_API_KEY
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const gatewayKey = LOVABLE_API_KEY || googleApiKey;

    if (!gatewayKey) {
      throw new Error("No AI API key configured (LOVABLE_API_KEY or GOOGLE_AI_API_KEY)");
    }

    const modelName = LOVABLE_API_KEY ? "google/gemini-2.5-flash" : "gemini-2.5-flash";

    console.log("Bulk SEO generation via", LOVABLE_API_KEY ? "Lovable AI Gateway" : "Google direct API");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, content, excerpt, meta_title, seo_title, focus_keyphrase, keyphrase_synonyms")
      .eq("status", "published")
      .or("meta_title.is.null,seo_title.is.null,focus_keyphrase.is.null,keyphrase_synonyms.is.null,meta_title.eq.,seo_title.eq.,focus_keyphrase.eq.,keyphrase_synonyms.eq.");

    if (fetchError) throw fetchError;

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No articles need SEO updates", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const article of articles) {
      try {
        let textContent = "";
        if (typeof article.content === "string") {
          textContent = article.content;
        } else if (Array.isArray(article.content)) {
          textContent = article.content.map((block: any) => block.content || "").join(" ");
        }

        const fullText = `${article.title}\n\n${article.excerpt || ""}\n\n${textContent}`.substring(0, 3000);

        const aiResponse = await fetch(gatewayUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gatewayKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: "system",
                content: `You are an expert SEO specialist. Generate SEO metadata for articles about AI, technology, and innovation in Asia-Pacific. Return ONLY valid JSON with these exact fields:
{
  "meta_title": "60 character HTML title tag with main keyword",
  "seo_title": "60 character optimized title with main keyword",
  "focus_keyphrase": "main keyword phrase (2-4 words)",
  "keyphrase_synonyms": "synonym1, synonym2, synonym3",
  "meta_description": "Write a COMPLETE sentence under 155 characters. Never end mid-sentence."
}`,
              },
              {
                role: "user",
                content: `Generate SEO metadata for this article:\n\n${fullText}`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for article ${article.id}:`, aiResponse.status);
          failed++;
          continue;
        }

        const aiData = await aiResponse.json();
        const generatedText = aiData.choices?.[0]?.message?.content;

        if (!generatedText) {
          console.error(`No content generated for article ${article.id}`);
          failed++;
          continue;
        }

        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`Invalid JSON for article ${article.id}`);
          failed++;
          continue;
        }

        const seoData = JSON.parse(jsonMatch[0]);

        const { error: updateError } = await supabase
          .from("articles")
          .update({
            meta_title: seoData.meta_title,
            seo_title: seoData.seo_title,
            focus_keyphrase: seoData.focus_keyphrase,
            keyphrase_synonyms: seoData.keyphrase_synonyms,
            meta_description: seoData.meta_description || article.excerpt,
          })
          .eq("id", article.id);

        if (updateError) {
          console.error(`Update error for article ${article.id}:`, updateError);
          failed++;
        } else {
          processed++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, failed, total: articles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bulk SEO generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
