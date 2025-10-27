import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId, title, content, excerpt } = await req.json();

    if (!articleId || !title) {
      return new Response(
        JSON.stringify({ error: "Article ID and title are required" }),
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

    // Extract text content from JSONB or string
    let textContent = "";
    if (typeof content === "string") {
      textContent = content;
    } else if (Array.isArray(content)) {
      textContent = content.map((block: any) => block.content || "").join(" ");
    }

    const fullText = `${title}\n\n${excerpt || ""}\n\n${textContent}`.substring(0, 3000);

    // Generate SEO metadata using Lovable AI
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
            content: `You are an expert SEO specialist. Generate SEO metadata for articles about AI, technology, and innovation in Asia-Pacific. Return ONLY valid JSON with these exact fields:
{
  "meta_title": "60 character HTML title tag with main keyword",
  "seo_title": "60 character optimized title with main keyword",
  "focus_keyphrase": "main keyword phrase (2-4 words)",
  "keyphrase_synonyms": "synonym1, synonym2, synonym3",
  "meta_description": "155 character compelling description with keyword"
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
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No content generated from AI");
    }

    // Parse JSON from AI response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }

    const seoData = JSON.parse(jsonMatch[0]);

    // Update the article with generated SEO data
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        meta_title: seoData.meta_title,
        seo_title: seoData.seo_title,
        focus_keyphrase: seoData.focus_keyphrase,
        keyphrase_synonyms: seoData.keyphrase_synonyms,
        meta_description: seoData.meta_description || excerpt,
      })
      .eq("id", articleId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: seoData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating SEO:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
