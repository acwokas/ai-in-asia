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

    // Fetch latest 50 published articles
    const { data: articles, error } = await supabase
      .from("articles")
      .select(`
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        published_at,
        updated_at,
        primary_category_id,
        categories:primary_category_id(name, slug),
        authors:author_id(name)
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching articles:", error);
      throw error;
    }

    const baseUrl = "https://aiinasia.com";
    const buildDate = new Date().toUTCString();

    // Build RSS XML
    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n';
    rss += "  <channel>\n";
    rss += "    <title>AI in ASIA</title>\n";
    rss += `    <link>${baseUrl}</link>\n`;
    rss += "    <description>Stay informed about AI developments, innovations, and insights from across Asia. Features, news, tools and expert opinions on artificial intelligence.</description>\n";
    rss += "    <language>en-us</language>\n";
    rss += `    <lastBuildDate>${buildDate}</lastBuildDate>\n`;
     rss += `    <atom:link href="${baseUrl}/rss" rel="self" type="application/rss+xml" />\n`;
     rss += `    <atom:link href="${baseUrl}/feed" rel="alternate" type="application/rss+xml" />\n`;

    // Add articles
    articles?.forEach((article: any) => {
      const categorySlug = article.categories?.slug || "uncategorized";
      const articleUrl = `${baseUrl}/${categorySlug}/${article.slug}`;
      const pubDate = new Date(article.published_at).toUTCString();
      const authorName = article.authors?.name || "AI in ASIA";
      const categoryName = article.categories?.name || "Uncategorized";

      // Escape XML special characters
      const escapeXml = (text: string) => {
        if (!text) return "";
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      };

      rss += "    <item>\n";
      rss += `      <title>${escapeXml(article.title)}</title>\n`;
      rss += `      <link>${articleUrl}</link>\n`;
      rss += `      <guid isPermaLink="true">${articleUrl}</guid>\n`;
      rss += `      <pubDate>${pubDate}</pubDate>\n`;
      rss += `      <dc:creator>${escapeXml(authorName)}</dc:creator>\n`;
      rss += `      <category>${escapeXml(categoryName)}</category>\n`;
      
      if (article.excerpt) {
        rss += `      <description>${escapeXml(article.excerpt)}</description>\n`;
      }
      
      if (article.featured_image_url) {
        rss += `      <enclosure url="${escapeXml(article.featured_image_url)}" type="image/jpeg" length="0" />\n`;
      }
      
      rss += "    </item>\n";
    });

    rss += "  </channel>\n";
    rss += "</rss>";

    console.log(`Generated RSS feed with ${articles?.length || 0} articles`);

    return new Response(rss, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
