const CACHE_NAME = 'stardew-life-v1'
const SHELL = ['/', '/index.html']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return

  // Cache-first for immutable hashed assets and sprites
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/sprites/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(resp => {
          const clone = resp.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone))
          return resp
        })
      })
    )
    return
  }

  // Network-first with shell fallback for navigation
  event.respondWith(
    fetch(request)
      .then(resp => {
        const clone = resp.clone()
        caches.open(CACHE_NAME).then(c => c.put(request, clone))
        return resp
      })
      .catch(() => caches.match(request).then(r => r ?? caches.match('/')))
  )
})

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Stardew Life', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
