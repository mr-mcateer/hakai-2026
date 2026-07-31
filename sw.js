/* Offline cache for the crew site. f7bb14f9 is stamped by build-site.py from a
   content hash, so any page change ships a new cache and old ones are dropped.
   PDFs are deliberately never cached — they are the save-to-phone artifact and
   would quadruple the cache weight. All paths relative: works at any mount. */
var V = "hakai-f7bb14f9";
var CORE = ["./", "index.html", "film-room.html", "manifest.webmanifest",
  "assets/hero.jpg", "assets/hero-720.webp",
  "assets/tyee-gap-640.webp", "assets/tyee-gap-950.webp",
  "assets/tyee-bell-640.webp", "assets/tyee-bell-950.webp",
  "assets/tyee-scale-640.webp", "assets/tyee-scale-1000.webp",
  "assets/paralyzer-640.webp", "assets/paralyzer-950.webp",
  "assets/boat-1100.webp", "assets/seawolf-950.webp",
  "assets/hookset-720.webp", "assets/stinger-720.webp", "assets/bait7-640.webp",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png", "assets/icons/favicon-32.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(V).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== V; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok && url.pathname.indexOf("/downloads/") === -1) {
          var copy = res.clone();
          caches.open(V).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    }).catch(function () {
      if (req.mode === "navigate") return caches.match("./index.html");
    })
  );
});
