// Service worker: keeps the app available offline.
// The page is fetched network-first (so content updates arrive when online) and falls
// back to the cached copy when offline. Static assets are served cache-first.
// Bump VERSION when changing the asset list below.
const VERSION = "v1";
const CACHE = "aep-" + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("aep-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first with a timeout, so a weak connection doesn't leave the app hanging.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request, {cache: "no-cache"}).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch (e) { /* offline: fall through to cache */ }
  const cached = await cache.match(request, {ignoreSearch: true}) || await cache.match("./index.html");
  return cached || network;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
  return res;
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(req.mode === "navigate" ? networkFirst(req) : cacheFirst(req));
});
