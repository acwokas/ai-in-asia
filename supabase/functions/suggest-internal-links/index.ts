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
    const { content, title, currentArticleId } = await req.json();

    if (!content || !title) {
      return new Response(
        JSON.stringify({ error: "Content and title are required" }),
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

    // Fetch published articles for internal linking (exclude current article)
    const query = supabase
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
      .limit(50);

    if (currentArticleId) {
      query.neq("id", currentArticleId);
    }

    const { data: articles, error: articlesError } = await query;

    if (articlesError) throw articlesError;

    // Create a condensed list of articles for the AI with correct /category/slug format
    const articlesList = articles?.map(a => {
      const categorySlug = a.categories?.slug || 'news';
      return `- ${a.title} (/${categorySlug}/${a.slug})`;
    }).join("\n") || "";

    // Use AI to suggest internal and external links
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
            content: `You are an SEO expert specializing in internal linking strategy. Analyze the article content and suggest:
1. 2-4 relevant internal links from our existing articles (provide exact titles and slugs)
2. 1-2 relevant external authoritative links (to high-quality sources like research papers, official reports, major publications)

For INTERNAL links:
- Only suggest links from the provided article list
- Use the EXACT URL format provided in the list (includes /category/slug structure)
- Choose articles that are genuinely relevant and add value
- Suggest where in the content each link should be placed (quote 3-5 words of anchor text)

For EXTERNAL links:
- Suggest authoritative external sources (academic, industry reports, major publications)
- These should support claims or provide additional context
- Specify anchor text and placement

Return ONLY valid JSON:
{
  "internalLinks": [
    {
      "articleTitle": "exact article title from list",
      "articleUrl": "/category/article-slug (use EXACT format from list)",
      "anchorText": "suggested anchor text",
      "placement": "context where it should be placed",
      "reason": "why this link is relevant"
    }
  ],
  "externalLinks": [
    {
      "url": "https://example.com/resource",
      "anchorText": "suggested anchor text",
      "placement": "context where it should be placed",
      "reason": "why this source is authoritative and relevant"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Article Title: ${title}\n\nArticle Content:\n${content.substring(0, 4000)}\n\nAvailable articles for internal linking:\n${articlesList}`,
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

    let linkSuggestions = JSON.parse(jsonMatch[0]);

    // Sanitize any lovable.app/dev URLs to relative paths in suggestions
    if (linkSuggestions.internalLinks) {
      linkSuggestions.internalLinks = linkSuggestions.internalLinks.map((link: any) => ({
        ...link,
        articleUrl: link.articleUrl
          ?.replace(/https?:\/\/[a-zA-Z0-9-]+\.lovable\.app/, '')
          ?.replace(/https?:\/\/(?:www\.)?aiinasia\.com/, '')
      }));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions: linkSuggestions 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error suggesting internal links:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
