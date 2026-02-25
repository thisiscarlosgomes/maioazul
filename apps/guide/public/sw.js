const OFFLINE_CACHE = "maio-offline-pack-v1";
const TILE_HOSTS = new Set([
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
  "c.tile.openstreetmap.org",
  "services.arcgisonline.com",
]);

const isTileRequest = (url) => TILE_HOSTS.has(url.hostname);
const isVoiceRequest = (url) => url.pathname.startsWith("/voice/");

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isTileRequest(url) && !isVoiceRequest(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const cached =
        (await cache.match(request)) ||
        (await cache.match(request.url)) ||
        null;
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
