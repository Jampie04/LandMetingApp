// GrongMarki service worker.
// Goal: keep previously visited dashboard routes usable when offline.
//
// Strategies:
//   - Navigation (HTML)          -> network-first, fallback to cached page,
//                                   then /dashboard/home, then /offline.html
//   - /_next/static/*            -> cache-first (immutable hashed assets)
//   - Other same-origin GET      -> stale-while-revalidate
//                                   (covers RSC payloads, fonts, SVGs, JSON)
//   - Supabase / cross-origin    -> bypassed, browser handles
//   - Non-GET                    -> bypassed

const CACHE_VERSION = "grongmarki-v6";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";
const PRECACHE = CACHE_VERSION + "-precache";

// Files we always want available offline.
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/brand/grongmarki-icon.svg",
  "/brand/grongmarki-icon-dark.svg",
  "/brand/grongmarki-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] precache failed:", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== RUNTIME_CACHE && k !== PRECACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  if (request.method !== "GET") return false;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function isCacheableResponse(response) {
  return (
    response &&
    response.status === 200 &&
    (response.type === "basic" || response.type === "default")
  );
}

async function networkFirstNavigation(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    if (isCacheableResponse(fresh)) {
      runtime.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (_) {
    // Offline path: try the exact URL, then a known dashboard shell, then offline.html.
    const exact = await runtime.match(request, { ignoreSearch: true });
    if (exact) return exact;

    const url = new URL(request.url);
    if (url.pathname.startsWith("/dashboard")) {
      const home = await runtime.match("/dashboard/home", { ignoreSearch: true });
      if (home) return home;
    }

    const offline = await caches.match("/offline.html");
    return (
      offline ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = await runtime.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (isCacheableResponse(fresh)) {
      runtime.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (_) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = await runtime.match(request);

  const networkPromise = fetch(request)
    .then((fresh) => {
      if (isCacheableResponse(fresh)) {
        runtime.put(request, fresh.clone()).catch(() => {});
      }
      return fresh;
    })
    .catch(() => null);

  if (cached) {
    // Don't await network — let it update in the background.
    networkPromise.catch(() => {});
    return cached;
  }
  const fresh = await networkPromise;
  if (fresh) return fresh;
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin (incl. Supabase, OSM tiles, fonts) -> let browser handle.
  if (url.origin !== self.location.origin) return;

  // Never intercept the SW scripts themselves.
  if (url.pathname === "/sw.js" || url.pathname === "/sw-init.js") return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
