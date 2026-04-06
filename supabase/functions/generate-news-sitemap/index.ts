import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Google News sitemaps must only contain articles from the last 2 days
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: articles, error } = await supabase
      .from("articles")
      .select(`
        id, title, slug, published_at,
        categories:primary_category_id(name, slug)
      `)
      .eq("status", "published")
      .gte("published_at", twoDaysAgo)
      .order("published_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Error fetching articles:", error);
      throw error;
    }

    const escapeXml = (text: string): string => {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';

    (articles || []).forEach((article: any) => {
      const categorySlug = article.categories?.slug || "uncategorized";
      const articleUrl = `https://aiinasia.com/${categorySlug}/${article.slug}`;
      const pubDate = article.published_at
        ? new Date(article.published_at).toISOString()
        : new Date().toISOString();

      xml += "  <url>\n";
      xml += `    <loc>${articleUrl}</loc>\n`;
      xml += "    <news:news>\n";
      xml += "      <news:publication>\n";
      xml += "        <news:name>AI in Asia</news:name>\n";
      xml += "        <news:language>en</news:language>\n";
      xml += "      </news:publication>\n";
      xml += `      <news:publication_date>${pubDate}</news:publication_date>\n`;
      xml += `      <news:title>${escapeXml(article.title)}</news:title>\n`;
      xml += "    </news:news>\n";
      xml += "  </url>\n";
    });

    xml += "</urlset>";

    console.log(`Generated news sitemap with ${articles?.length || 0} articles`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=900", // 15 minutes
      },
    });
  } catch (error) {
    console.error("Error generating news sitemap:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
