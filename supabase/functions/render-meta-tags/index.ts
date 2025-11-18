import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detect social media crawlers
const isCrawler = (userAgent: string): boolean => {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    const userAgent = req.headers.get('user-agent') || '';

    console.log('Render meta tags request:', { path, userAgent });

    // Only process if it's a crawler
    if (!isCrawler(userAgent)) {
      return new Response(
        JSON.stringify({ message: 'Not a crawler' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Parse the path to extract category and slug
    // Expected format: /category/slug or /news/slug
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

    // Fetch article
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

    // Clean WordPress placeholders
    const cleanText = (text: string | null) => {
      if (!text) return '';
      return text
        .replace(/%%sep%%/g, '|')
        .replace(/%%sitename%%/g, 'AI in ASIA')
        .trim();
    };

    // Prepare meta data
    const title = cleanText(article.meta_title || article.title);
    const description = cleanText(article.meta_description || article.excerpt);
    const imageUrl = article.featured_image_url?.startsWith('http')
      ? article.featured_image_url
      : `https://aiinasia.com${article.featured_image_url}`;
    const articleUrl = `https://aiinasia.com/${article.categories?.slug || 'news'}/${article.slug}`;
    const authorName = article.authors?.name || 'AI in Asia';

    // Generate HTML with meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="AI in ASIA">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${articleUrl}">
  ${article.published_at ? `<meta property="article:published_time" content="${article.published_at}">` : ''}
  ${article.updated_at ? `<meta property="article:modified_time" content="${article.updated_at}">` : ''}
  <meta property="article:author" content="${authorName}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@aiinasia">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Redirect to actual page -->
  <meta http-equiv="refresh" content="0;url=${articleUrl}">
  <script>window.location.href="${articleUrl}";</script>
</head>
<body>
  <p>Redirecting to <a href="${articleUrl}">${title}</a>...</p>
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
