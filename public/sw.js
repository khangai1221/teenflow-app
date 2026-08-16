// Minimal service worker: exists only to satisfy the "installable PWA"
// criteria (a registered SW with a fetch handler) and to cache the static
// icon/manifest assets. TeenFlow is a live family task app — cached/stale
// task, points, or schedule state would actively mislead a family — so
// pages, auth, and Supabase API calls are deliberately left untouched and
// always go straight to the network.
const CACHE = "teenflow-static-v1";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icon", "/icon-192", "/apple-icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

// Web Push: payload is JSON { title, body, url } — see lib/push.ts. Falls
// back to a generic notification if the payload is missing/malformed so a
// push never silently drops.
self.addEventListener("push", (event) => {
  let data = { title: "TeenFlow", body: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads, use the fallback above
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192",
      badge: "/icon-192",
      data: { url: data.url || "/home" },
    }),
  );
});

// Clicking a notification focuses an already-open TeenFlow tab if one
// exists (navigating it to the target path), otherwise opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
