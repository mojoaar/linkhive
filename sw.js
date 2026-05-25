var CACHE_NAME = 'linkhive-v2';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/themes.css',
  '/css/components.css',
  '/js/config.js',
  '/js/icons.js',
  '/js/configStore.js',
  '/js/utils/dom.js',
  '/js/utils/github.js',
  '/js/storage.js',
  '/js/themes.js',
  '/js/linkStore.js',
  '/js/ui/forms.js',
  '/js/ui/modals.js',
  '/js/ui/sidebar.js',
  '/js/ui/linkGrid.js',
  '/js/app.js',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        var fetched = fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function () {
          return cached || new Response('Offline', { status: 503 });
        });
        return cached || fetched;
      })
    );
  }
});
