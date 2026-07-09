const CACHE = 'lifeos-v1'
const STATIC_CACHE = 'lifeos-static-v1'
const ASSET_CACHE = 'lifeos-assets-v1'

const STATIC_URLS = [
  '/',
  '/notes',
  '/habits',
  '/search',
  '/tags',
  '/stats',
  '/settings',
  '/login',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(STATIC_URLS).catch(() => {
        // Pre-cache best-effort; individual fetches will fall through to network
      })
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE && k !== STATIC_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Next.js static assets: cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            cache.put(request, response.clone())
            return response
          })
          return cached || fetchPromise
        })
      })
    )
    return
  }

  // Static assets (icons, fonts): cache-first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            cache.put(request, response.clone())
            return response
          })
          return cached || fetchPromise
        })
      })
    )
    return
  }

  // API routes: network-only, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Navigation requests: network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/')
        })
      })
    )
    return
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request)
    })
  )
})
