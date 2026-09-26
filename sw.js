/*
  Tablet Master service worker.
  Purpose: enable "Add to Home Screen" installability and basic offline
  loading of the app shell. It does NOT touch your data — everything you
  enter still lives in localStorage (and Firebase, if you turned on sync),
  never in this cache.

  If you edit tablet-master-simple.html and re-deploy it, bump CACHE_NAME
  below (e.g. 'tablet-master-v2') so devices pick up the new file instead
  of serving the old cached copy.
*/
const CACHE_NAME = 'tablet-master-v1';
const APP_SHELL = [
  './tablet-master-simple.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).catch(function(){ /* offline on first install - ignore */ })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  // Only manage same-origin app-shell files. Everything else (Firebase
  // Realtime Database, Google Fonts, CDN scripts) goes straight to the
  // network untouched so live sync and other data always stay fresh.
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      // Serve cached instantly when we have it (fast + works offline),
      // and refresh the cache in the background for next time.
      return cached || networkFetch;
    })
  );
});
