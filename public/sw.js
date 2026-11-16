// Retires the offline copy of the old Tattoo Tycoon game some devices installed from this address before it became
// Chorecast: the worker unregisters itself, clears its caches and reloads open pages. Chorecast has no service worker.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', () => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then(clients => { clients.forEach(c => { if (c instanceof WindowClient) c.navigate(c.url); }); })
    .then(() => self.caches.keys())
    .then(names => Promise.all(names.map(n => self.caches.delete(n))));
});
