// Service worker volontairement neutre pendant le développement actif de Cadence.
// L'ancien cache PWA pouvait conserver un index.html obsolète pointant vers
// d'anciens fichiers JS hashés, ce qui provoquait une page blanche après déploiement.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // Ne pas intercepter les requêtes : le navigateur et Cloudflare servent les fichiers frais.
});
