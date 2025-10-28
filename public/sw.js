const CACHE_NAME = 'aiinasia-v1';
const IMAGE_CACHE = 'aiinasia-images-v1';

// Cache images aggressively
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache images from Supabase storage
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        
        if (cached) {
          // Return cached image immediately
          return cached;
        }

        // Fetch and cache new image
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          console.error('Failed to fetch image:', error);
          return new Response('Image failed to load', { status: 503 });
        }
      })
    );
  }
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
