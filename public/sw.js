const CACHE_NAME = 'aiinasia-v2';
const IMAGE_CACHE = 'aiinasia-images-v2';
const MAX_IMAGE_CACHE_SIZE = 100;
const MAX_IMAGE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.png'
];

// Install event - pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
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
    'SkypeUriPreview',
    'googlebot',
    'bingbot',
  ];
  return crawlers.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
};

// Helper function to clean old images from cache
async function cleanImageCache(cache) {
  try {
    const requests = await cache.keys();
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
    
    if (requestsWithDates.length > MAX_IMAGE_CACHE_SIZE) {
      const toDelete = requestsWithDates.slice(MAX_IMAGE_CACHE_SIZE);
      await Promise.all(toDelete.map(item => cache.delete(item.request)));
    }
  } catch (error) {
    console.error('Failed to clean image cache:', error);
  }
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
  try {
    const { request } = event;
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // Only handle GET requests
    if (request.method !== 'GET') return;

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
      if (pathParts.length >= 2) {
        event.respondWith(
          fetch(`https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/render-meta-tags?path=${url.pathname}`, {
            headers: { 'user-agent': userAgent }
          }).catch(() => fetch(request))
        );
        return;
      }
    }

    // Navigation requests: network first, fallback to offline page
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          })
          .catch(async () => {
            const cached = await caches.match(request);
            return cached || caches.match('/offline.html');
          })
      );
      return;
    }

    // Cache images from Supabase storage
    if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
      event.respondWith(
        caches.open(IMAGE_CACHE).then(async (cache) => {
          const cached = await cache.match(request);
          
          if (cached) {
            const cacheDate = cached.headers.get('sw-cache-date');
            const age = cacheDate ? Date.now() - parseInt(cacheDate) : 0;
            const response = cached.clone();
            
            if (age > MAX_IMAGE_AGE) {
              event.waitUntil(
                fetch(request).then(freshResponse => {
                  if (freshResponse.ok && freshResponse.headers.get('content-type')?.startsWith('image/')) {
                    const headers = new Headers(freshResponse.headers);
                    headers.set('sw-cache-date', Date.now().toString());
                    const responseWithDate = new Response(freshResponse.body, {
                      status: freshResponse.status,
                      statusText: freshResponse.statusText,
                      headers: headers
                    });
                    cache.put(request, responseWithDate);
                    cleanImageCache(cache);
                  }
                }).catch(() => {})
              );
            }
            
            return response;
          }

          try {
            const fetchRequest = new Request(request, {
              headers: new Headers({
                ...Object.fromEntries(request.headers.entries()),
                'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
              })
            });
            
            const response = await fetch(fetchRequest);
            
            if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
              const headers = new Headers(response.headers);
              headers.set('sw-cache-date', Date.now().toString());
              const responseToCache = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers
              });
              cache.put(request, responseToCache.clone());
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

    // IMPORTANT: do not cache Vite dev module URLs (can cause React duplication / invalid hook calls)
    if (
      url.origin === self.location.origin &&
      (url.pathname.startsWith('/node_modules/.vite/') ||
        url.pathname.startsWith('/node_modules/') ||
        url.pathname.startsWith('/@') ||
        url.pathname.startsWith('/src/') ||
        url.searchParams.has('v'))
    ) {
      event.respondWith(fetch(request));
      return;
    }

    // Asset requests: cache first, then network (production assets)
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          })
        );
      })
    );
  } catch (error) {
    console.error('Service worker fetch error:', error);
  }
});
