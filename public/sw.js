const CACHE_NAME = 'aiinasia-v1';
const IMAGE_CACHE = 'aiinasia-images-v1';

// Install event - required for service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Detect crawlers and bots
const isCrawler = (userAgent) => {
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
    'WhatsApp',
    'SkypeUriPreview',
    'googlebot',
    'bingbot',
  ];
  return crawlers.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
};

// Cache images aggressively and handle crawler requests
self.addEventListener('fetch', (event) => {
  try {
    const { request } = event;
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // Skip Google Ads and external resources
    if (url.hostname.includes('google') || 
        url.hostname.includes('doubleclick') || 
        url.hostname.includes('googlesyndication') ||
        url.hostname.includes('googletagmanager')) {
      return;
    }

    // Handle crawler requests for article pages
    if (isCrawler(userAgent) && url.origin === self.location.origin && url.pathname.includes('/')) {
    const pathParts = url.pathname.split('/').filter(p => p);
    // Check if it looks like an article URL (category/slug format)
    if (pathParts.length >= 2) {
      event.respondWith(
        fetch(`https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/render-meta-tags?path=${url.pathname}`, {
          headers: {
            'user-agent': userAgent
          }
        }).catch(() => fetch(request))
      );
      return;
    }
  }

  // Cache images from Supabase storage with optimized strategy
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        
        if (cached) {
          // Return cached image immediately, but update cache in background
          event.waitUntil(
            fetch(request).then(response => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
            }).catch(() => {})
          );
          return cached;
        }

        // Fetch and cache new image with optimizations
        try {
          const response = await fetch(request);
          if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
            // Only cache successful image responses
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          console.error('Failed to fetch image:', error);
          return new Response('Image failed to load', { status: 503 });
        }
      })
    );
    return;
  }
  } catch (error) {
    console.error('Service worker fetch error:', error);
  }
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});
