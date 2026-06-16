import { APP_VERSION } from './constants.js';

export const PWA_CACHE_NAME = `cadence-pwa:${APP_VERSION}`;

const PWA_CORE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/branding/logo-cadence-light.svg',
  '/branding/logo-cadence-dark.svg',
  '/fonts/lato/lato-latin-400-normal.woff2',
  '/fonts/lato/lato-latin-700-normal.woff2',
  '/fonts/comfortaa/comfortaa-latin-700-normal.woff2',
];

function toAbsoluteUrl(value) {
  return new URL(value, window.location.href).href;
}

function shouldCacheResource(url) {
  if (url.origin !== window.location.origin) return false;
  return /\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(url.pathname)
    || url.pathname === '/'
    || url.pathname === '/index.html'
    || url.pathname === '/manifest.webmanifest';
}

function collectShellUrls() {
  const urls = new Set(PWA_CORE_URLS.map(toAbsoluteUrl));
  if (typeof performance === 'undefined') return [...urls];
  for (const entry of performance.getEntriesByType('resource')) {
    if (!entry?.name) continue;
    const url = new URL(entry.name, window.location.href);
    if (!shouldCacheResource(url)) continue;
    urls.add(url.href);
  }
  return [...urls];
}

export async function primePwaShellCache() {
  if (!import.meta.env.PROD || typeof caches === 'undefined') return false;
  const cache = await caches.open(PWA_CACHE_NAME);
  const urls = collectShellUrls();
  await Promise.allSettled(urls.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok || response.type === 'opaque') {
        await cache.put(url, response.clone());
      }
    } catch {
      // Une ressource manquante ne bloque pas le cache global.
    }
  }));
  return true;
}

export async function registerCadencePwa(onUpdateAvailable = () => {}) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.register('/service-worker.js');
  const notifyIfWaiting = () => {
    if (registration.waiting) onUpdateAvailable(registration);
  };

  if (registration.waiting && navigator.serviceWorker.controller) notifyIfWaiting();

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyIfWaiting();
    });
  });

  try {
    await registration.update();
  } catch {
    // La mise à jour est opportuniste.
  }

  return registration;
}

export function activateWaitingServiceWorker(registration) {
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
