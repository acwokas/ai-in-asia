const CACHE_NAME = 'aiinasia-v2';
const IMAGE_CACHE = 'aiinasia-images-v2';
const MAX_IMAGE_CACHE_SIZE = 100; // Limit cache to 100 images
const MAX_IMAGE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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

  // Cache images from Supabase storage with advanced cache-first strategy
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        
        if (cached) {
          // Check cache age
          const cacheDate = cached.headers.get('sw-cache-date');
          const age = cacheDate ? Date.now() - parseInt(cacheDate) : 0;
          
          // Return cached image immediately
          const response = cached.clone();
          
          // Update in background if older than 7 days
          if (age > MAX_IMAGE_AGE) {
            event.waitUntil(
              fetch(request).then(freshResponse => {
                if (freshResponse.ok && freshResponse.headers.get('content-type')?.startsWith('image/')) {
                  // Add cache date header
                  const headers = new Headers(freshResponse.headers);
                  headers.set('sw-cache-date', Date.now().toString());
                  
                  const responseWithDate = new Response(freshResponse.body, {
                    status: freshResponse.status,
                    statusText: freshResponse.statusText,
                    headers: headers
                  });
                  
                  cache.put(request, responseWithDate);
                  
                  // Clean old cache entries
                  cleanImageCache(cache);
                }
              }).catch(() => {})
            );
          }
          
          return response;
        }

        // Fetch and cache new image with compression hints
        try {
          const fetchRequest = new Request(request, {
            headers: new Headers({
              ...Object.fromEntries(request.headers.entries()),
              'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
            })
          });
          
          const response = await fetch(fetchRequest);
          
          if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
            // Add cache date header
            const headers = new Headers(response.headers);
            headers.set('sw-cache-date', Date.now().toString());
            
            const responseToCache = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: headers
            });
            
            cache.put(request, responseToCache.clone());
            
            // Clean old cache entries
            event.waitUntil(cleanImageCache(cache));
            
            return responseToCache;
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

// Helper function to clean old images from cache
async function cleanImageCache(cache) {
  try {
    const requests = await cache.keys();
    
    // Sort by cache date
    const requestsWithDates = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request);
        const dateHeader = response?.headers.get('sw-cache-date');
        return {
          request,
          date: dateHeader ? parseInt(dateHeader) : 0
        };
      })
    );
    
    requestsWithDates.sort((a, b) => b.date - a.date);
    
    // Remove oldest entries if cache is too large
    if (requestsWithDates.length > MAX_IMAGE_CACHE_SIZE) {
      const toDelete = requestsWithDates.slice(MAX_IMAGE_CACHE_SIZE);
      await Promise.all(toDelete.map(item => cache.delete(item.request)));
    }
  } catch (error) {
    console.error('Failed to clean image cache:', error);
  }
}

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
