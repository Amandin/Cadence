const APP_VERSION = '0.13.1';
const CACHE_PREFIX = 'cadence-pwa';
const CACHE_NAME = `${CACHE_PREFIX}:${APP_VERSION}`;

const CORE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/branding/logo-cadence-light.svg',
  '/branding/logo-cadence-dark.svg',
  '/fonts/lato/lato-latin-400-normal.woff2',
  '/fonts/lato/lato-latin-700-normal.woff2',
  '/fonts/comfortaa/comfortaa-latin-700-normal.woff2',
];

function sameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}

function isCacheableAsset(request) {
  if (request.method !== 'GET' || !sameOrigin(request.url)) return false;
  if (request.mode === 'navigate') return true;
  const url = new URL(request.url);
  return /\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(url.pathname)
    || url.pathname === '/manifest.webmanifest'
    || url.pathname.startsWith('/branding/')
    || url.pathname.startsWith('/fonts/');
}

async function precacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(CORE_URLS.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok || response.type === 'opaque') {
        await cache.put(url, response.clone());
      }
    } catch {
      // Les ressources optionnelles ne doivent pas bloquer l'installation.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheCoreAssets());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`) && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableAsset(request)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cacheable = response.clone();
          await cache.put('/index.html', cacheable.clone());
          await cache.put('/', cacheable);
        }
        return response;
      } catch {
        return await cache.match(request) || await cache.match('/index.html') || await cache.match('/') || new Response('Application hors ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});
