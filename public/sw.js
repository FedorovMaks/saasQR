const CACHE_NAME = "qrmenu-v2";
const OFFLINE_URL = "/offline.html";

// Static assets to pre-cache
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install — cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — stale-while-revalidate for static, network-first for pages
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API calls, SSE streams
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.get("accept")?.includes("text/event-stream")) return;

  // Navigation requests — network first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (images, fonts, CSS, JS) — cache first, network fallback
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.match(/\.(js|css|woff2?|png|jpg|webp|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }
});

// Push notification
self.addEventListener("push", (event) => {
  let data = { title: "QRMenu", body: "Новый заказ!" };
  try {
    data = event.data.json();
  } catch {
    // use defaults
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "order",
    data: { url: data.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click on notification — open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
