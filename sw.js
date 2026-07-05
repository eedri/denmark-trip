// Offline support for the trip site.
// - Same-origin (the encrypted page, manifest, icons): network-first, cache fallback
//   so itinerary/password updates land when online but everything opens offline.
// - Leaflet (unpkg) + OSRM route: stale-while-revalidate.
// - Map tiles (CARTO): stale-while-revalidate, capped — areas you've viewed work offline.
const VERSION = "v1";
const CORE = "trip-core-" + VERSION;
const TILES = "trip-tiles";
const CDN = "trip-cdn";

const CORE_URLS = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const CDN_URLS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    await (await caches.open(CORE)).addAll(CORE_URLS);
    const cdn = await caches.open(CDN);
    await Promise.all(CDN_URLS.map(u => cdn.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith("trip-core-") && k !== CORE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const cache = await caches.open(CORE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000))
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req) || await cache.match("./");
    if (hit) return hit;
    throw err;
  }
}

async function trim(cache, limit) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(k);
}

async function staleWhileRevalidate(req, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(res => {
    if (res && (res.ok || res.type === "opaque")) {
      cache.put(req, res.clone()).then(() => trim(cache, limit));
    }
    return res;
  }).catch(() => null);
  if (hit) return hit;
  const res = await refresh;
  return res || Response.error();
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(networkFirst(e.request));
  } else if (url.hostname.endsWith("cartocdn.com")) {
    e.respondWith(staleWhileRevalidate(e.request, TILES, 600));
  } else if (url.hostname === "unpkg.com" || url.hostname === "router.project-osrm.org") {
    e.respondWith(staleWhileRevalidate(e.request, CDN, 60));
  }
  // api.open-meteo.com is deliberately NOT intercepted: the app fetches it live and
  // keeps its own offline copy in localStorage with an honest "updated" timestamp.
});
