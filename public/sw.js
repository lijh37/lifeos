// LifeOS Service Worker — minimal static asset precache

const CACHE = 'lifeos-static-v1'

const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    })()
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin + '/_next/static/')) return

  e.respondWith(
    (async () => {
      const hit = await caches.match(request)
      if (hit) return hit
      const res = await fetch(request)
      const c = await caches.open(CACHE)
      c.put(request, res.clone())
      return res
    })()
  )
})
