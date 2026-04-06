// Cloudflare Pages Worker for AI in ASIA
// Handles: SEO prerendering for bots, article slug validation via Supabase,
// category validation with 301 redirects, and category misspelling redirects.

const SUPABASE_URL = 'https://pbmtnvxywplgpldmlygv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibXRudnh5d3BsZ3BsZG1seWd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQ2NjA5MywiZXhwIjoyMDc3MDQyMDkzfQ.feU5mYFHy5NXE7Ew9Fv7kV2t3bm2aYJ4vqAOG2UqoGU';

// Prerender.io token (set via Cloudflare env var if available)
const PRERENDER_TOKEN = typeof PRERENDER_API_TOKEN !== 'undefined' ? PRERENDER_API_TOKEN : '';

// Category UUID to slug mapping
const CATEGORY_UUID_TO_SLUG = {
  '65520fa1-c045-4a40-b7ae-418d22026a0e': 'news',
  'f2be6a0a-219c-4afb-84c7-0264e26cee6c': 'learn',
};

// Valid category slugs (derived from UUID map + any additional known categories)
const VALID_CATEGORY_SLUGS = new Set([
  'news',
  'learn',
  'greater-china',
  'southeast-asia',
  'east-asia',
  'south-asia',
  'central-asia',
  'middle-east',
  'oceania',
  'global',
  'deep-dives',
  'opinion',
  'interviews',
  'reviews',
  'startups',
  'policy',
  'research',
]);

// Category misspelling/country redirects
const CATEGORY_REDIRECTS = {
  'china': 'greater-china',
  'singapore': 'southeast-asia',
  'japan': 'east-asia',
  'korea': 'east-asia',
  'india': 'south-asia',
  'indonesia': 'southeast-asia',
  'thailand': 'southeast-asia',
  'vietnam': 'southeast-asia',
  'malaysia': 'southeast-asia',
  'philippines': 'southeast-asia',
  'taiwan': 'east-asia',
  'hongkong': 'greater-china',
  'hong-kong': 'greater-china',
  'ai': 'news',
  'technology': 'news',
};

// Bot user agents for prerendering
const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'Applebot',
  'WhatsApp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'SkypeUriPreview',
  'nuzzel',
  'Discordbot',
  'Google Page Speed',
  'Qwantify',
  'pinterestbot',
  'Bitrix link preview',
  'XING-contenttabreceiver',
  'TelegramBot',
];

// Static asset extensions to skip
const STATIC_ASSET_REGEX = /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|woff2|svg|eot|webp|avif|json|webmanifest)$/i;

/**
 * Check if a request is from a known bot/crawler
 */
function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

/**
 * Look up an article by slug in Supabase
 * Returns the article row (with category_id) or null
 */
async function lookupArticle(slug) {
  const url = `${SUPABASE_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&select=id,slug,category_id,status&limit=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    // On error, fail open - let the request through
    console.error('Supabase lookup error:', e);
    return undefined; // undefined = lookup failed, don't block
  }
}

/**
 * Serve a prerendered page via Prerender.io for bot requests
 */
async function servePrerenderResponse(url) {
  if (!PRERENDER_TOKEN) return null;
  try {
    const prerenderUrl = `https://service.prerender.io/${url}`;
    const response = await fetch(prerenderUrl, {
      headers: {
        'X-Prerender-Token': PRERENDER_TOKEN,
      },
    });
    if (response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600',
          'X-Prerendered': 'true',
        },
      });
    }
  } catch (e) {
    console.error('Prerender error:', e);
  }
  return null;
}

/**
 * Return a proper 404 response
 */
function notFoundResponse() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Page Not Found | AI in ASIA</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 4rem; margin: 0; color: #ef4444; }
    p { font-size: 1.25rem; color: #64748b; margin: 1rem 0; }
    a { color: #3b82f6; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>This article doesn't exist.</p>
    <a href="/">Back to AI in ASIA</a>
  </div>
</body>
</html>`,
    {
      status: 404,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=60',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const userAgent = request.headers.get('User-Agent') || '';

    // Use env vars if available (Cloudflare Pages environment)
    const prerenderToken = env?.PRERENDER_API_TOKEN || PRERENDER_TOKEN;

    // --- 1. Skip static assets entirely ---
    if (STATIC_ASSET_REGEX.test(pathname)) {
      return env?.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
    }

    // --- 2. Category misspelling redirects ---
    const categoryMatch = pathname.match(/^\/category\/([^/]+)\/?$/);
    if (categoryMatch) {
      const requestedCategory = categoryMatch[1].toLowerCase();
      if (CATEGORY_REDIRECTS[requestedCategory]) {
        const correctCategory = CATEGORY_REDIRECTS[requestedCategory];
        return Response.redirect(`${url.origin}/category/${correctCategory}`, 301);
      }
    }

    // --- 3. Article page handling: /:category/:slug ---
    const articleMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (articleMatch) {
      const urlCategory = articleMatch[1];
      const slug = articleMatch[2];

      // Skip if this looks like a known non-article route
      const nonArticleRoutes = new Set([
        'category', 'api', 'auth', 'admin', 'assets', 'icons',
        'images', 'logos', 'public', 'static', 'src', '_next',
        'partners', 'about', 'contact', 'privacy', 'terms',
        'search', 'tags', 'authors', 'newsletter', 'subscribe',
      ]);
      if (!nonArticleRoutes.has(urlCategory)) {
        // Look up the article in Supabase
        const article = await lookupArticle(slug);

        if (article === null) {
          // Article definitively not found - return 404
          return notFoundResponse();
        }

        if (article && article.category_id) {
          // Check if the URL category matches the article's actual category
          const actualCategorySlug = CATEGORY_UUID_TO_SLUG[article.category_id];
          if (actualCategorySlug && actualCategorySlug !== urlCategory) {
            // Category mismatch - 301 redirect to correct category
            return Response.redirect(
              `${url.origin}/${actualCategorySlug}/${slug}`,
              301
            );
          }
        }

        // Article exists and category matches (or lookup failed - fail open)
        // For bots, try prerendering
        if (isBot(userAgent) && prerenderToken) {
          const prerenderResponse = await servePrerenderResponse(url.href);
          if (prerenderResponse) return prerenderResponse;
        }
      }
    }

    // --- 4. For all other bot requests, try prerendering ---
    if (isBot(userAgent) && prerenderToken && !STATIC_ASSET_REGEX.test(pathname)) {
      const prerenderResponse = await servePrerenderResponse(url.href);
      if (prerenderResponse) return prerenderResponse;
    }

    // --- 5. Default: serve the static asset / SPA ---
    return env?.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
  },
};
