const CACHE_NAME = "qrmenu-v4";
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

  // Skip non-GET requests entirely
  if (request.method !== "GET") return;

  // NEVER cache API calls — let them pass through to network
  if (url.pathname.startsWith("/api/")) return;

  // Skip SSE streams
  if (request.headers.get("accept")?.includes("text/event-stream")) return;

  // Skip requests with no-cache/no-store headers (polling)
  if (request.headers.get("cache-control")?.includes("no-cache") ||
      request.headers.get("cache-control")?.includes("no-store")) return;

  // Navigation requests — always network first, offline fallback
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

// Push notification — shows even when app is closed/in background
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
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || "order-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: data.url || "/admin" },
    actions: [
      { action: "open", title: "Открыть" },
      { action: "dismiss", title: "Закрыть" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click on notification — open/focus the correct page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // "Закрыть" button — just close notification
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Find existing admin window and navigate it to the right page
      for (const client of clients) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // No existing window — open new one
      return self.clients.openWindow(targetUrl);
    })
  );
});
