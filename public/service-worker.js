// Iwacumo Service Worker
// Caching strategies for PWA offline support

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { precacheAndRoute } = workbox.precaching;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache static assets (JS, CSS, fonts) - Cache First
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache images - Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache tRPC API calls - Network First
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/trpc'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  })
);

// Cache book covers and assets - Stale While Revalidate
registerRoute(
  ({ url }) =>
    url.hostname.includes('vercel-storage.com') ||
    url.hostname.includes('ucarecdn.com') ||
    url.hostname.includes('cloudinary.com'),
  new StaleWhileRevalidate({
    cacheName: 'book-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Handle offline fallback for app routes
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && url.pathname.startsWith('/app'),
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  })
);

// Background sync for reading progress
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reading-progress') {
    event.waitUntil(syncReadingProgress());
  }
});

async function syncReadingProgress() {
  // This will be handled by the sync engine in the app
  console.log('Background sync triggered for reading progress');
}

// Service worker update handling
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
