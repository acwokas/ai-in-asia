import type { APIRoute } from 'astro';
import { createServerClient } from '../lib/supabase';
import { siteConfig } from '../site.config';

export const GET: APIRoute = async () => {
  const supabase = createServerClient(
    siteConfig.supabaseUrl,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey,
  );

  const { data: articles } = await supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, published_at,
      authors:author_id (name),
      categories:primary_category_id (name, slug)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(50);

  const items = (articles || [])
    .filter(a => a.published_at)
    .map(a => {
      const url = `${siteConfig.url}/${(a as any).categories?.slug || 'news'}/${a.slug}`;
      const author = (a as any).authors?.name || siteConfig.defaultAuthor;
      const excerpt = (a.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const title = (a.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.published_at!).toUTCString()}</pubDate>
      ${excerpt ? `<description><![CDATA[${excerpt}]]></description>` : ''}
      ${author ? `<dc:creator><![CDATA[${author}]]></dc:creator>` : ''}
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${siteConfig.name}</title>
    <link>${siteConfig.url}</link>
    <description>${siteConfig.tagline}</description>
    <language>${siteConfig.locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
