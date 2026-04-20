import type { APIRoute } from 'astro';
import { createServerClient } from '../lib/supabase';
import { siteConfig } from '../site.config';

export const GET: APIRoute = async ({ locals }) => {
  const supabase = createServerClient(
    siteConfig.supabaseUrl,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey,
  );

  const { data: articles } = await supabase
    .from('articles')
    .select('slug, published_at, updated_at, categories:primary_category_id (slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(5000);

  const articleUrls = (articles || []).map(a => {
    const catSlug = (a as any).categories?.slug || 'news';
    const loc = `${siteConfig.url}/${catSlug}/${a.slug}`;
    const lastmod = ((a as any).updated_at || a.published_at)?.slice(0, 10) || '';
    return `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const categoryPages = ['news', 'business', 'life', 'learn', 'create', 'voices'].map(c => `
  <url>
    <loc>${siteConfig.url}/${c}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>`).join('');

  const staticPages = ['', '/guides', '/events', '/newsletter', '/about', '/tools', '/search'].map(p => `
  <url>
    <loc>${siteConfig.url}${p}</loc>
    <changefreq>daily</changefreq>
    <priority>${p === '' ? '1.0' : '0.7'}</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages}
${categoryPages}
${articleUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
