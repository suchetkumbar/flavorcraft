// FlavorCraft service worker: keeps the app usable in a kitchen with no signal.
//
// What works offline: the app itself (every page's code is stored on first
// visit), the recipe catalog and your kitchen (both already kept in the
// browser), and cook mode. What doesn't: recipe photos you haven't seen yet,
// the assistant, and anything in Community.
//
// The two constants below are filled in at build time by the plugin in
// vite.config.ts. Left as they are, the worker still runs; it just starts
// with an empty cache.
const VERSION = 'dev';
const ASSETS = [];

const SHELL = `flavorcraft-shell-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // One missing file must not stop the rest from being stored.
      .then((cache) => Promise.allSettled(['/index.html', ...ASSETS].map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('flavorcraft-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Other sites (recipe data, photos, accounts) and our own API go straight to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Fresh page when online; the stored app when not. Every route is the same app.
    event.respondWith(fetch(request).catch(() => caches.match('/index.html', { cacheName: SHELL, ignoreVary: true }).then((hit) => hit ?? Response.error())));
    return;
  }

  // Built files have their content in their name, so a stored copy is never stale.
  // ignoreVary: servers mark these "Vary: Origin", and a script tag's request carries
  // an Origin header that the request used to store the file did not.
  event.respondWith(
    caches.match(request, { cacheName: SHELL, ignoreVary: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith('/assets/')) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
