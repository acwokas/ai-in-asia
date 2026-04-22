import type { APIRoute } from 'astro';
import { createServerClient } from '../lib/supabase';
import { siteConfig } from '../site.config';

// Google News Sitemap — only articles from the last 2 days
export const GET: APIRoute = async () => {
  const supabase = createServerClient(
    siteConfig.supabaseUrl,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey,
  );

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const { data: articles } = await supabase
    .from('articles')
    .select('slug, title, published_at, categories:primary_category_id (slug)')
    .eq('status', 'published')
    .gte('published_at', twoDaysAgo)
    .order('published_at', { ascending: false })
    .limit(1000);

  const newsUrls = (articles || []).map(a => {
    const catSlug = (a as any).categories?.slug || 'news';
    const loc = `${siteConfig.url}/${catSlug}/${a.slug}`;
    const pubDate = a.published_at
      ? new Date(a.published_at).toISOString()
      : new Date().toISOString();
    const title = (a.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>AI in Asia</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
};
