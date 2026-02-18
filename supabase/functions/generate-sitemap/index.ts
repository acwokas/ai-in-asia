import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const baseUrl = "https://aiinasia.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-sitemap`;

    // Sub-sitemap request
    if (lastSegment && lastSegment.endsWith('.xml') && lastSegment.startsWith('sitemap-')) {
      const slug = lastSegment.replace('sitemap-', '').replace('.xml', '');
      return await handleSubSitemap(supabase, slug, edgeFunctionUrl);
    }

    // Main sitemap index
    return await handleSitemapIndex(supabase, edgeFunctionUrl);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Last-Modified": new Date().toUTCString(),
    },
  });
}

function buildUrlset(urls: { loc: string; lastmod: string; changefreq: string; priority: number }[]) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) {
    xml += `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
  }
  xml += '</urlset>';
  return xml;
}

function freshness(publishedAt: string) {
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000);
  if (days <= 7) return { priority: 0.9, changefreq: "daily" };
  if (days <= 30) return { priority: 0.8, changefreq: "weekly" };
  if (days <= 90) return { priority: 0.7, changefreq: "weekly" };
  return { priority: 0.6, changefreq: "monthly" };
}

async function handleSubSitemap(supabase: any, slug: string, _edgeFunctionUrl: string) {
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  if (slug === 'main') {
    const staticPages = [
      { loc: `${baseUrl}/`, lastmod: today, changefreq: 'daily', priority: 1.0 },
      { loc: `${baseUrl}/about`, lastmod: today, changefreq: 'monthly', priority: 0.8 },
      { loc: `${baseUrl}/contact`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/events`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/guides`, lastmod: today, changefreq: 'weekly', priority: 0.8 },
      { loc: `${baseUrl}/newsletter`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/newsletter/archive`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
      { loc: `${baseUrl}/newsletter-weekly`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
      { loc: `${baseUrl}/ai-policy-atlas`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/contribute`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/media-and-partners`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/editorial-standards`, lastmod: today, changefreq: 'yearly', priority: 0.5 },
      { loc: `${baseUrl}/privacy`, lastmod: today, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/terms`, lastmod: today, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/cookie-policy`, lastmod: today, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/news/3-before-9`, lastmod: today, changefreq: 'daily', priority: 0.7 },
    ];
    return xmlResponse(buildUrlset(staticPages));
  }

  // Guides sitemap
  if (slug === 'guides') {
    const { data: guides, error } = await supabase
      .from("ai_guides")
      .select("slug, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const urls = (guides || []).map((g: any) => {
      const f = freshness(g.created_at);
      return {
        loc: `${baseUrl}/guides/${g.slug}`,
        lastmod: new Date(g.updated_at).toISOString().split('T')[0],
        changefreq: f.changefreq,
        priority: f.priority,
      };
    });
    return xmlResponse(buildUrlset(urls));
  }

  // Authors sitemap
  if (slug === 'authors') {
    const { data: authors, error } = await supabase
      .from("authors")
      .select("slug, updated_at")
      .order("name");
    if (error) throw error;

    const urls = (authors || []).map((a: any) => ({
      loc: `${baseUrl}/author/${a.slug}`,
      lastmod: new Date(a.updated_at).toISOString().split('T')[0],
      changefreq: "monthly" as const,
      priority: 0.6,
    }));
    return xmlResponse(buildUrlset(urls));
  }

  // Tags sitemap
  if (slug === 'tags') {
    const { data: tags, error } = await supabase
      .from("tags")
      .select("slug");
    if (error) throw error;

    const urls = (tags || []).map((t: any) => ({
      loc: `${baseUrl}/tag/${t.slug}`,
      lastmod: today,
      changefreq: "weekly" as const,
      priority: 0.5,
    }));
    return xmlResponse(buildUrlset(urls));
  }

  // Categories index sitemap (category landing pages)
  if (slug === 'categories') {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("slug")
      .neq("slug", "uncategorized");
    if (error) throw error;

    const urls = (categories || []).map((c: any) => ({
      loc: `${baseUrl}/category/${c.slug}`,
      lastmod: today,
      changefreq: "daily" as const,
      priority: 0.8,
    }));
    return xmlResponse(buildUrlset(urls));
  }

  // Newsletter archive sitemap
  if (slug === 'newsletters') {
    // Newsletter archive pages use date-based URLs
    const { data: newsletters, error } = await supabase
      .from("newsletters")
      .select("send_date")
      .eq("status", "sent")
      .order("send_date", { ascending: false });

    if (error) {
      // Table might not exist, return empty
      console.warn("newsletters table error:", error.message);
      return xmlResponse(buildUrlset([]));
    }

    const urls = (newsletters || []).map((n: any) => ({
      loc: `${baseUrl}/newsletter/archive/${n.send_date}`,
      lastmod: n.send_date,
      changefreq: "monthly" as const,
      priority: 0.5,
    }));
    return xmlResponse(buildUrlset(urls));
  }

  // Policy regions sitemap
  if (slug === 'policy-regions') {
    // Policy regions are derived from articles with country/region data
    const regions = [
      'southeast-asia', 'east-asia', 'south-asia', 'central-asia',
      'middle-east', 'oceania', 'europe', 'americas', 'africa'
    ];
    const urls = regions.map(r => ({
      loc: `${baseUrl}/ai-policy-atlas/${r}`,
      lastmod: today,
      changefreq: "weekly" as const,
      priority: 0.6,
    }));
    return xmlResponse(buildUrlset(urls));
  }

  // Category-specific article sitemap (e.g., sitemap-news.xml)
  const { data: category } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (!category) {
    return new Response("Sitemap not found", { status: 404 });
  }

  // Fetch all articles for this category (handle >1000 with pagination)
  let allArticles: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: batch, error } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at, categories:primary_category_id(slug)")
      .eq("status", "published")
      .eq("primary_category_id", category.id)
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!batch || batch.length === 0) break;
    allArticles = allArticles.concat(batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  const urls = allArticles.map((article: any) => {
    const f = freshness(article.published_at);
    return {
      loc: `${baseUrl}/${article.categories?.slug || slug}/${article.slug}`,
      lastmod: new Date(article.updated_at).toISOString().split('T')[0],
      changefreq: f.changefreq,
      priority: f.priority,
    };
  });

  return xmlResponse(buildUrlset(urls));
}

async function handleSitemapIndex(supabase: any, edgeFunctionUrl: string) {
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .neq("slug", "uncategorized");

  const now = new Date().toISOString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-main.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // Category landing pages
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-categories.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // Articles per category
  for (const cat of (categories || [])) {
    xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-${cat.slug}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;
  }

  // Guides
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-guides.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // Authors
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-authors.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // Tags
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-tags.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // Newsletters
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-newsletters.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // Policy regions
  xml += `  <sitemap>\n    <loc>${edgeFunctionUrl}/sitemap-policy-regions.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  xml += '</sitemapindex>';
  return xmlResponse(xml);
}
