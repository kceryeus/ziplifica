const CACHE_NAME = "ziplifica-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/app/app.html",
  "/app/developer.html",
  "/app/app.js",
  "/app/developer.js",
  "/app/styles.css",
  "/assets/css/style.css",
  "/assets/js/main.js",
  "/logo-white.png",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

