const CACHE_NAME = "khmer-library-v6";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/favicon.ico",
  "/ios/180.png",
  "/manifest.webmanifest",
  "/browserconfig.xml",
  "/android/launchericon-192x192.png",
  "/android/launchericon-512x512.png",
  "/windows/Square44x44Logo.targetsize-256.png",
  "/windows/Square150x150Logo.scale-100.png",
];
const STATIC_DESTINATIONS = new Set(["image", "font", "manifest"]);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(async () => {
        if ("navigationPreload" in self.registration) {
          await self.registration.navigationPreload.enable().catch(() => undefined);
        }
        await self.clients.claim();
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;
  if (request.destination === "script" || request.destination === "style" || request.destination === "worker") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination) || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function handleNavigationRequest(event) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const preload = await event.preloadResponse;
    if (preload) {
      if (preload.ok) await cache.put(event.request, preload.clone());
      return preload;
    }

    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  } catch {
    return (await cache.match(event.request)) || (await cache.match("/offline.html")) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fresh = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || Response.error());

  return cached || fresh;
}
