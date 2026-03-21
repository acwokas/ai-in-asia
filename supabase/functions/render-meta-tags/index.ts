import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detect social media crawlers
const isSocialCrawler = (userAgent: string): boolean => {
  const crawlers = [
    'facebookexternalhit',
    'WhatsApp',
    'Twitterbot',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'Discordbot',
    'Pinterest',
    'redditbot',
  ];
  return crawlers.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
};

// Detect search engine crawlers
const isSearchCrawler = (userAgent: string): boolean => {
  const crawlers = [
    'Googlebot',
    'Googlebot-Mobile',
    'Google-InspectionTool',
    'bingbot',
    'Baiduspider',
    'YandexBot',
    'DuckDuckBot',
    'Applebot',
    'AhrefsBot',
    'SemrushBot',
    'MJ12bot',
    'Bytespider',
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'ChatGPT-User',
    'Google-Extended',
    'CCBot',
    'anthropic-ai',
    'Amazonbot',
    'cohere-ai',
  ];
  return crawlers.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
};

// Strip HTML tags and normalize whitespace
const stripHtml = (html: string | null): string => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

// Clean WordPress placeholders
const cleanText = (text: string | null): string => {
  if (!text) return '';
  return text
    .replace(/%%sep%%/g, '|')
    .replace(/%%sitename%%/g, 'AI in ASIA')
    .trim();
};

// Escape HTML for safe attribute/content insertion
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    const userAgent = req.headers.get('user-agent') || '';

    console.log('Render meta tags request:', { path, userAgent: userAgent.substring(0, 120) });

    const socialCrawler = isSocialCrawler(userAgent);
    const searchCrawler = isSearchCrawler(userAgent);

    // Only process if it's a crawler
    if (!socialCrawler && !searchCrawler) {
      return new Response(
        JSON.stringify({ message: 'Not a crawler' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Parse the path to extract slug
    const pathParts = path.split('/').filter(p => p);
    if (pathParts.length < 2) {
      return new Response(
        JSON.stringify({ message: 'Invalid path' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const slug = pathParts[pathParts.length - 1];

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch article with full data
    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        authors (name, slug),
        categories:primary_category_id (name, slug)
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !article) {
      console.error('Article not found:', error);
      return new Response(
        JSON.stringify({ message: 'Article not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Prepare meta data
    const title = cleanText(article.meta_title || article.title);
    const description = cleanText(article.meta_description || article.excerpt);
    const categorySlug = article.categories?.slug || 'news';
    const categoryName = article.categories?.name || 'News';
    const rawImageUrl = article.featured_image_url?.startsWith('http')
      ? article.featured_image_url
      : article.featured_image_url
        ? `https://aiinasia.com${article.featured_image_url}`
        : null;
    const imageUrl = rawImageUrl
      ? `${rawImageUrl}${rawImageUrl.includes('?') ? '&' : '?'}v=3`
      : 'https://aiinasia.com/icons/aiinasia-512.png?v=3';
    const articleUrl = `https://aiinasia.com/${categorySlug}/${article.slug}`;
    const authorName = article.authors?.name || 'AI in Asia';
    const authorSlug = article.authors?.slug || '';

    // ── SOCIAL MEDIA CRAWLERS: lightweight meta tags + redirect ──
    if (socialCrawler && !searchCrawler) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="AI in ASIA">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(articleUrl)}">
  ${article.published_at ? `<meta property="article:published_time" content="${article.published_at}">` : ''}
  ${article.updated_at ? `<meta property="article:modified_time" content="${article.updated_at}">` : ''}
  <meta property="article:author" content="${escapeHtml(authorName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AI_in_Asia">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(articleUrl)}">
  <script>window.location.href="${articleUrl}";</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(articleUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      });
    }

    // ── SEARCH ENGINE CRAWLERS: full semantic HTML ──

    // Extract article content as HTML string
    let contentHtml = '';
    if (typeof article.content === 'string') {
      contentHtml = article.content;
    } else if (article.content && typeof article.content === 'object') {
      // TipTap JSON or similar – stringify for now, content is stored as HTML string in most cases
      contentHtml = JSON.stringify(article.content);
    }

    // Build JSON-LD structured data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': categorySlug === 'news' ? 'NewsArticle' : 'Article',
      headline: title,
      description: description,
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
        width: 1200,
        height: 675,
      },
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at || article.published_at || article.created_at,
      author: {
        '@type': 'Person',
        name: authorName,
        ...(authorSlug && { url: `https://aiinasia.com/author/${authorSlug}` }),
      },
      publisher: {
        '@type': 'Organization',
        name: 'AI in Asia',
        logo: {
          '@type': 'ImageObject',
          url: 'https://aiinasia.com/icons/aiinasia-512.png',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
      isAccessibleForFree: true,
      inLanguage: 'en-GB',
      ...(categoryName && { articleSection: categoryName }),
      ...(article.reading_time_minutes && { timeRequired: `PT${article.reading_time_minutes}M` }),
      ...(article.ai_tags && { keywords: article.ai_tags.join(', ') }),
    };

    const publishedDate = article.published_at
      ? new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | AI in ASIA</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(articleUrl)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="AI in ASIA">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(articleUrl)}">
  <meta property="og:locale" content="en_GB">
  ${article.published_at ? `<meta property="article:published_time" content="${article.published_at}">` : ''}
  ${article.updated_at ? `<meta property="article:modified_time" content="${article.updated_at}">` : ''}
  <meta property="article:author" content="${escapeHtml(authorName)}">
  <meta property="article:section" content="${escapeHtml(categoryName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AI_in_Asia">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <header>
    <nav aria-label="Main navigation">
      <a href="https://aiinasia.com/">AI in ASIA</a>
      <ul>
        <li><a href="https://aiinasia.com/news">News</a></li>
        <li><a href="https://aiinasia.com/business">Business</a></li>
        <li><a href="https://aiinasia.com/life">Life</a></li>
        <li><a href="https://aiinasia.com/voices">Voices</a></li>
        <li><a href="https://aiinasia.com/learn">Learn</a></li>
        <li><a href="https://aiinasia.com/create">Create</a></li>
        <li><a href="https://aiinasia.com/policy">Policy</a></li>
        <li><a href="https://aiinasia.com/ai-guides">AI Guides</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <article>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <span class="category"><a href="https://aiinasia.com/${escapeHtml(categorySlug)}">${escapeHtml(categoryName)}</a></span>
        <span class="author">By <a href="https://aiinasia.com/author/${escapeHtml(authorSlug)}">${escapeHtml(authorName)}</a></span>
        ${publishedDate ? `<time datetime="${article.published_at}">${publishedDate}</time>` : ''}
        ${article.reading_time_minutes ? `<span class="reading-time">${article.reading_time_minutes} min read</span>` : ''}
      </div>
      ${article.featured_image_url ? `<figure><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(article.featured_image_alt || article.title)}" width="1200" height="675">${article.featured_image_caption ? `<figcaption>${escapeHtml(article.featured_image_caption)}</figcaption>` : ''}</figure>` : ''}
      ${article.excerpt ? `<p class="excerpt"><strong>${escapeHtml(article.excerpt)}</strong></p>` : ''}
      <div class="article-content">
        ${contentHtml}
      </div>
    </article>
  </main>
  <footer>
    <p>AI in ASIA – Leading platform for AI news, insights, and innovation across Asia.</p>
    <nav aria-label="Footer navigation">
      <a href="https://aiinasia.com/about">About</a>
      <a href="https://aiinasia.com/contact">Contact</a>
      <a href="https://aiinasia.com/privacy">Privacy</a>
      <a href="https://aiinasia.com/terms">Terms</a>
    </nav>
  </footer>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
