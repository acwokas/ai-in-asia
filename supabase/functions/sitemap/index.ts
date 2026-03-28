import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeXml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const baseUrl = "https://aiinasia.com";
const sanitizePathSegment = (value: string | null | undefined) =>
  encodeURIComponent((value || '').trim().replace(/\s+/g, '-'));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // Static pages
    const staticPages = [
      { loc: `${baseUrl}`, changefreq: "daily", priority: "1.0", lastmod: today },
      { loc: `${baseUrl}/about`, changefreq: "monthly", priority: "0.5", lastmod: today },
      { loc: `${baseUrl}/ai-policy-atlas`, changefreq: "weekly", priority: "0.8", lastmod: today },
    ];

    // Fetch all published articles
    const { data: articles, error: artErr } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at, categories:primary_category_id(slug)")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false });

    if (artErr) throw artErr;

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, updated_at");

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    for (const p of staticPages) {
      xml += "  <url>\n";
      xml += `    <loc>${escapeXml(p.loc)}</loc>\n`;
      xml += `    <lastmod>${p.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
      xml += `    <priority>${p.priority}</priority>\n`;
      xml += "  </url>\n";
    }

    // Category pages
    if (categories) {
      for (const cat of categories) {
        xml += "  <url>\n";
        xml += `    <loc>${escapeXml(`${baseUrl}/category/${cat.slug}`)}</loc>\n`;
        xml += `    <lastmod>${(cat.updated_at || today).split("T")[0]}</lastmod>\n`;
        xml += "    <changefreq>weekly</changefreq>\n";
        xml += "    <priority>0.6</priority>\n";
        xml += "  </url>\n";
      }
    }

    // Article pages
    for (const a of articles || []) {
      const catSlug = (a.categories as any)?.slug || "news";
      const lastmod = ((a.updated_at || a.published_at) ?? today).split("T")[0];
      xml += "  <url>\n";
      xml += `    <loc>${escapeXml(`${baseUrl}/${sanitizePathSegment(catSlug)}/${sanitizePathSegment(a.slug)}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += "    <changefreq>weekly</changefreq>\n";
      xml += "    <priority>0.7</priority>\n";
      xml += "  </url>\n";
    }

    xml += "</urlset>";

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Sitemap error:", err);
    return new Response(`<?xml version="1.0"?><error>${message}</error>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
