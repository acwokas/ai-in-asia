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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const urls: { loc: string; lastmod: string; changefreq: string; priority: number }[] = [
      { loc: `${baseUrl}/`, lastmod: today, changefreq: 'daily', priority: 1.0 },
      { loc: `${baseUrl}/about`, lastmod: today, changefreq: 'monthly', priority: 0.8 },
      { loc: `${baseUrl}/contact`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/events`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/events/submit`, lastmod: today, changefreq: 'monthly', priority: 0.5 },
      { loc: `${baseUrl}/guides`, lastmod: today, changefreq: 'weekly', priority: 0.8 },
      { loc: `${baseUrl}/newsletter`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/newsletter/archive`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
      { loc: `${baseUrl}/newsletter-weekly`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
      { loc: `${baseUrl}/prompts`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/ai-policy-atlas`, lastmod: today, changefreq: 'weekly', priority: 0.7 },
      { loc: `${baseUrl}/contribute`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/media-and-partners`, lastmod: today, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/editorial-standards`, lastmod: today, changefreq: 'yearly', priority: 0.5 },
      { loc: `${baseUrl}/privacy`, lastmod: today, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/terms`, lastmod: today, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/cookie-policy`, lastmod: today, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/news/3-before-9`, lastmod: today, changefreq: 'daily', priority: 0.7 },
    ];

    // Category landing pages
    const { data: categories } = await supabase
      .from("categories")
      .select("slug")
      .neq("slug", "uncategorized");

    for (const c of (categories || [])) {
      urls.push({ loc: `${baseUrl}/category/${c.slug}`, lastmod: today, changefreq: 'daily', priority: 0.8 });
    }

    // All published articles (paginated to handle >1000)
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch, error } = await supabase
        .from("articles")
        .select("slug, updated_at, published_at, categories:primary_category_id(slug)")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!batch || batch.length === 0) break;

      for (const a of batch) {
        const days = Math.floor((Date.now() - new Date(a.published_at).getTime()) / 86400000);
        const catSlug = (a as any).categories?.slug || 'uncategorized';
        urls.push({
          loc: `${baseUrl}/${catSlug}/${a.slug}`,
          lastmod: new Date(a.updated_at).toISOString().split('T')[0],
          changefreq: days <= 7 ? 'daily' : days <= 30 ? 'weekly' : 'monthly',
          priority: days <= 7 ? 0.9 : days <= 30 ? 0.8 : days <= 90 ? 0.7 : 0.6,
        });
      }
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    // Guides
    const { data: guides } = await supabase
      .from("ai_guides")
      .select("slug, updated_at")
      .order("updated_at", { ascending: false });

    for (const g of (guides || [])) {
      urls.push({
        loc: `${baseUrl}/guides/${g.slug}`,
        lastmod: new Date(g.updated_at).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7,
      });
    }

    // Authors
    const { data: authors } = await supabase
      .from("authors")
      .select("slug, updated_at")
      .order("name");

    for (const a of (authors || [])) {
      urls.push({
        loc: `${baseUrl}/author/${a.slug}`,
        lastmod: new Date(a.updated_at).toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: 0.6,
      });
    }

    // Tags
    let allTags: { slug: string }[] = [];
    let tagFrom = 0;
    while (true) {
      const { data: tagBatch } = await supabase
        .from("tags")
        .select("slug")
        .order("slug")
        .range(tagFrom, tagFrom + 999);
      if (!tagBatch || tagBatch.length === 0) break;
      allTags = allTags.concat(tagBatch);
      if (tagBatch.length < 1000) break;
      tagFrom += 1000;
    }

    for (const t of allTags) {
      urls.push({
        loc: `${baseUrl}/tag/${t.slug}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.5,
      });
    }

    // Learning paths (hardcoded in frontend constants)
    const learningPathsByCategory: Record<string, string[]> = {
      news: ['this-week-in-asian-ai', 'ai-policy-tracker', 'funding-and-deals', 'research-radar'],
      business: ['ai-roi-playbook', 'enterprise-ai-101', 'ai-in-asean-markets', 'governance-essentials'],
      life: ['ai-safety-for-everyone', 'ai-and-mental-health', 'smart-ai-shopping', 'ai-in-entertainment'],
      learn: ['ai-for-complete-beginners', 'prompt-engineering-mastery', 'ai-tools-power-user'],
      create: ['ai-writing-mastery', 'ai-image-generation', 'ai-video-and-audio'],
      voices: ['ai-in-business-asia'],
    };

    for (const [catSlug, paths] of Object.entries(learningPathsByCategory)) {
      for (const pathSlug of paths) {
        urls.push({
          loc: `${baseUrl}/category/${catSlug}/learn/${pathSlug}`,
          lastmod: today,
          changefreq: 'weekly',
          priority: 0.6,
        });
      }
    }

    // Newsletter editions
    try {
      const { data: newsletters } = await supabase
        .from('newsletter_editions')
        .select('id, updated_at')
        .eq('status', 'sent')
        .order('updated_at', { ascending: false });

      for (const nl of (newsletters || [])) {
        urls.push({
          loc: `${baseUrl}/newsletter/${nl.id}`,
          lastmod: new Date(nl.updated_at).toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: 0.5,
        });
      }
    } catch (_e) {
      // Skip if newsletter_editions table doesn't exist
    }

    // Policy regions
    const policyRegions = [
      'southeast-asia', 'east-asia', 'south-asia', 'central-asia',
      'middle-east', 'oceania', 'europe', 'americas', 'africa'
    ];
    for (const r of policyRegions) {
      urls.push({ loc: `${baseUrl}/ai-policy-atlas/${r}`, lastmod: today, changefreq: 'weekly', priority: 0.6 });
    }

    // Policy sub-pages
    urls.push({ loc: `${baseUrl}/ai-policy-atlas/compare`, lastmod: today, changefreq: 'weekly', priority: 0.6 });
    urls.push({ loc: `${baseUrl}/ai-policy-atlas/updates`, lastmod: today, changefreq: 'daily', priority: 0.7 });

    // Build single flat urlset
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const u of urls) {
      xml += `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    }
    xml += '</urlset>';

    console.log(`Generated sitemap with ${urls.length} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Last-Modified": new Date().toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
