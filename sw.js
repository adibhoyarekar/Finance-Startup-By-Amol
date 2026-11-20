/* Only job: when a page is opened without a connection, show offline.html instead of the browser's error page.
   Every request still goes to the network first; nothing else is cached. */
var CACHE = 'cm-offline-v1', PAGE = '/offline.html';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add(new Request(PAGE, { cache: 'reload' })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('cm-offline-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () {
    return self.registration.navigationPreload ? self.registration.navigationPreload.enable() : null;
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.mode !== 'navigate' || r.method !== 'GET') return;
  e.respondWith(Promise.resolve(e.preloadResponse).then(function (pre) { return pre || fetch(r); }).catch(function () {
    return caches.match(PAGE).then(function (res) { return res || Response.error(); });
  }));
});
