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
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const categorySlug = pathSegments[pathSegments.length - 1];
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const baseUrl = "https://aiinasia.com";

    // Check if this is a category-specific sitemap request
    if (categorySlug && categorySlug.endsWith('.xml')) {
      const slug = categorySlug.replace('.xml', '');
      
      // Fetch category
      const { data: category } = await supabase
        .from("categories")
        .select("id, slug")
        .eq("slug", slug)
        .single();

      if (!category) {
        return new Response("Category not found", { status: 404 });
      }

    // Fetch articles for this category
      const { data: articles, error } = await supabase
        .from("articles")
        .select(`
          slug,
          updated_at,
          published_at,
          primary_category_id,
          categories:primary_category_id(slug)
        `)
        .eq("status", "published")
        .eq("primary_category_id", category.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      articles?.forEach((article: any) => {
        const lastmod = new Date(article.updated_at).toISOString().split("T")[0];
        const publishedDate = new Date(article.published_at);
        const daysSincePublished = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Dynamic priority based on freshness
        let priority = 0.7;
        let changefreq = "monthly";
        
        if (daysSincePublished <= 7) {
          priority = 0.9;
          changefreq = "daily";
        } else if (daysSincePublished <= 30) {
          priority = 0.8;
          changefreq = "weekly";
        } else if (daysSincePublished <= 90) {
          priority = 0.7;
          changefreq = "weekly";
        }
        
        sitemap += `  <url>
    <loc>${baseUrl}/${article.categories?.slug || slug}/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
      });

      sitemap += "</urlset>";

      return new Response(sitemap, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600",
          "Last-Modified": new Date().toUTCString(),
        },
      });
    }

    // Generate sitemap index
    const { data: categories } = await supabase
      .from("categories")
      .select("slug");

    const { data: tags } = await supabase
      .from("tags")
      .select("slug");

    const { data: authors } = await supabase
      .from("authors")
      .select("slug");

    const { data: articles } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at, primary_category_id, categories:primary_category_id(slug)")
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    // Build sitemap index
    let sitemapIndex = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemapIndex += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Main sitemap with static pages
    sitemapIndex += `  <sitemap>
    <loc>${baseUrl}/sitemap-main.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>\n`;

    // Category-specific sitemaps
    categories?.forEach((category: any) => {
      sitemapIndex += `  <sitemap>
    <loc>${baseUrl}/sitemap-${category.slug}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>\n`;
    });

    sitemapIndex += "</sitemapindex>";

    return new Response(sitemapIndex, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
        "Last-Modified": new Date().toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
