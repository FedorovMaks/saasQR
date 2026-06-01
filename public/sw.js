const CACHE_NAME = "qrmenu-v5";
const OFFLINE_URL = "/offline.html";

// Install — precache only the offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Activate — drop all old caches and take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — intentionally minimal and safe.
// We only provide an offline fallback for page navigations. Everything else
// passes straight through to the network (no SW caching), which avoids the
// scheme/Response bugs that previously broke the whole site.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only touch same-origin http(s) requests — never extensions / cross-origin
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Page navigations: try network, fall back to the offline page if truly offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // All other requests: do nothing — let the browser handle them normally.
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

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
