/* EasyScreenplay — service worker.
   Makes the site work with no network after the first visit, and makes it
   installable. VERSION is written by build.py from a hash of index.html, so a
   rebuild invalidates the old cache and nothing else does.
   Does nothing at all when the file is opened from disk (file://). */
var VERSION = '{{version}}';
var CACHE = 'easyscreenplay-' + VERSION;
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/favicon-32.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* one miss must not fail the whole install */
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){
      return k !== CACHE && k.indexOf('easyscreenplay-') === 0 ? caches.delete(k) : null;
    }));
  }).then(function(){ return self.clients.claim(); }));
});

/* Stale-while-revalidate for our own files: the page opens instantly from the
   cache, and the next visit gets whatever changed. Anything cross-origin (the
   fonts) is left to the browser. */
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(req, {ignoreSearch: true}).then(function(hit){
      var live = fetch(req).then(function(res){
        if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      }).catch(function(){
        /* offline: a navigation still gets the app */
        return hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined);
      });
      return hit || live;
    });
  }));
});
