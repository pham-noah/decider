// Simple offline cache for the PWA build. Bump CACHE when you ship changes.
const CACHE = "decider-5713698bf2";
const FILES = [
  "./", "index.html", "fonts.css", "manifest.json", "native-bridge.js", "app-nav.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png", "icons/favicon.png",
  "fonts/bricolage-400.woff2", "fonts/bricolage-600.woff2", "fonts/bricolage-800.woff2",
  "fonts/bricolage-400-ext.woff2", "fonts/bricolage-600-ext.woff2", "fonts/bricolage-800-ext.woff2"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
