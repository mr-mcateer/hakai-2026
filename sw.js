/* Offline cache for the crew site (v3 build). 4f0b8e3c is stamped by
   build-site-v3.py from a content hash, so any page change ships a new cache
   and old ones are dropped — including the pre-v3 caches, since activate
   deletes every cache that is not the current key. PDFs are deliberately never
   cached. The archived long-form copy under v2/ is served by this worker's
   runtime caching (never precached), so it works offline after one visit.
   All paths relative: works at any mount. */
var V = "hakai-4f0b8e3c";
var CORE = ["./", "index.html", "film-room.html", "manifest.webmanifest",
  "assets/hero.jpg", "assets/hero-720.webp",
  "assets/fonts/source-serif-4-600.woff2", "assets/fonts/source-serif-4-700.woff2",
  "assets/tyee-gap-640.webp", "assets/tyee-gap-950.webp",
  "assets/tyee-bell-640.webp", "assets/tyee-bell-950.webp",
  "assets/tyee-scale-640.webp", "assets/tyee-scale-1000.webp",
  "assets/paralyzer-640.webp", "assets/paralyzer-950.webp",
  "assets/boat-1100.webp", "assets/seawolf-950.webp",
  "assets/hookset-720.webp", "assets/stinger-720.webp", "assets/bait7-640.webp",
  "assets/catch-640.webp", "assets/catch-950.webp",
  "assets/coho-640.webp", "assets/coho-950.webp",
  "assets/fr/WIpw59F2TB8.jpg", "assets/fr/tlW_YrT9lF0.jpg",
  "assets/fr/LxIjgopZTv8.jpg", "assets/fr/SJKKywuoHbM.jpg",
  "assets/fr/y-yNgfRViNM.jpg", "assets/fr/B185ldIyDDk.jpg",
  "assets/fr/27kvMCM6xT4.jpg", "assets/fr/BTpAl7GQhpQ.jpg",
  "assets/fr/GSNz8wBvhsY.jpg", "assets/fr/8pgezrHpf1E.jpg",
  "assets/fr/MGuQYZOuH48.jpg", "assets/fr/ggq2P1fj2kc.jpg",
  "assets/fr/0Ztl-NEGheQ.jpg", "assets/fr/C9FtP6L6Q1Y.jpg",
  "assets/fr/pgl0eOsAY9w.jpg", "assets/fr/nvtOB5SViag.jpg",
  "assets/fr/md9N8U9oruw.jpg", "assets/fr/ZqBEPBdbqJg.jpg",
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
