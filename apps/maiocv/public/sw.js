import { evictionUrls, mayStoreNavigation, NAVIGATION_CACHE_LIMIT, offlineBanner } from "./sw-policy.mjs";

const SHELL = "maiocv-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(["/pt", "/offline.html"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/maio-chat")) return;
  if (url.hostname === "tile.openstreetmap.org") return;
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(fromNetwork(event.request));
});

async function fromNetwork(request) {
  try {
    const response = await fetch(request);
    if (mayStoreNavigation(new URL(request.url), response)) {
      const headers = new Headers(response.headers);
      headers.set("X-Maio-Saved-At", new Date().toISOString());
      const stored = new Response(await response.clone().arrayBuffer(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      const cache = await caches.open(SHELL);
      await cache.put(request, stored);
      const keys = await cache.keys();
      const drop = evictionUrls(keys.map((key) => key.url), NAVIGATION_CACHE_LIMIT, ["/pt", "/offline.html"]);
      for (const url of drop) await cache.delete(url);
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL);
    const cached = await cache.match(request);
    if (cached) return labelCached(request, cached);
    const fallback = await cache.match("/offline.html");
    if (fallback) return labelCached(request, fallback);
    return Response.error();
  }
}

async function labelCached(request, response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const savedAt = response.headers.get("X-Maio-Saved-At");
  const banner = offlineBanner(new URL(request.url).pathname, savedAt);
  const html = await response.text();
  const next = /<body[^>]*>/i.test(html)
    ? html.replace(/<body[^>]*>/i, (open) => `${open}${banner}`)
    : `${banner}${html}`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(next, { status: response.status, statusText: response.statusText, headers });
}
