import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeXml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: articles, error } = await supabase
      .from("articles")
      .select(`
        title,
        slug,
        excerpt,
        meta_description,
        featured_image_url,
        published_at,
        created_at,
        categories:primary_category_id(name, slug)
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) throw error;

    const baseUrl = "https://www.aiinasia.com";
    const buildDate = new Date().toUTCString();

    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    rss += "  <channel>\n";
    rss += "    <title>AI in Asia</title>\n";
    rss += `    <link>${baseUrl}</link>\n`;
    rss += "    <description>Independent AI news covering the Asia-Pacific</description>\n";
    rss += "    <language>en-gb</language>\n";
    rss += `    <lastBuildDate>${buildDate}</lastBuildDate>\n`;
    rss += `    <atom:link href="${supabaseUrl}/functions/v1/rss-feed" rel="self" type="application/rss+xml" />\n`;

    for (const article of articles || []) {
      const cat = article.categories as any;
      const catSlug = cat?.slug || "news";
      const articleUrl = `${baseUrl}/${catSlug}/${article.slug}`;
      const description = article.excerpt || article.meta_description || "";
      const pubDate = new Date(article.published_at || article.created_at).toUTCString();

      rss += "    <item>\n";
      rss += `      <title>${escapeXml(article.title)}</title>\n`;
      rss += `      <link>${articleUrl}</link>\n`;
      rss += `      <description>${escapeXml(description)}</description>\n`;
      rss += `      <pubDate>${pubDate}</pubDate>\n`;
      rss += `      <guid isPermaLink="true">${articleUrl}</guid>\n`;
      if (cat?.name) {
        rss += `      <category>${escapeXml(cat.name)}</category>\n`;
      }
      rss += "    </item>\n";
    }

    rss += "  </channel>\n";
    rss += "</rss>";

    return new Response(rss, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("RSS feed error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
