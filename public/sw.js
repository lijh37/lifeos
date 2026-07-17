// LifeOS Service Worker — offline caching
//
// Challenges with Next.js App Router:
//   1. Page HTML loads BEFORE SW activates → first visit never caches pages
//   2. Client navigation uses GET with `RSC: 1` header (not POST)
//   3. PWA start_url is `/` which 307 redirects to `/notes`
//
// Solution:
//   - Activate warm-up: proactively fetch & cache current page + root URL
//   - Network-first for all GET: cache on success, fallback on failure
//   - Navigation fallback: scan cache for any HTML page when exact URL missed

const CACHE = 'lifeos-v1'

const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

const isStatic = (p) =>
  p.startsWith('/_next/static/') ||
  p === '/manifest.json' ||
  p.startsWith('/icons/')

// ─── Install ────────────────────────────────────────────

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// ─── Activate ───────────────────────────────────────────

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()

  // Warm cache: fetch current page + root so next visit works offline.
  // Runs async — doesn't block activation.
  warmCache()
})

async function warmCache() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' })
    await Promise.all(clients.map(async (client) => {
      if (!client?.url) return
      const url = new URL(client.url)
      if (url.origin !== self.location.origin) return

      const c = await caches.open(CACHE)
      const targets = [url.href]
      if (url.pathname !== '/') targets.push('/')
      // Also warm /notes since that's what start_url redirects to
      if (url.pathname !== '/notes') targets.push('/notes')

      await Promise.all(targets.map(async (target) => {
        // Skip if already cached
        const existing = await caches.match(target)
        if (existing) return

        try {
          const res = await fetch(target, { credentials: 'same-origin' })
          if (res.ok) c.put(target, res)
        } catch {
          // Silent — warm-cache is best-effort
        }
      }))
    }))
  } catch {
    // Silent
  }
}

// ─── Fetch ──────────────────────────────────────────────

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Static assets (immutable, content-hashed): cache-first
  if (isStatic(url.pathname)) {
    e.respondWith(cacheFirst(request))
    return
  }

  // Everything else (pages, RSC data, API): network-first
  e.respondWith(networkFirst(request))
})

async function cacheFirst(req) {
  const hit = await caches.match(req)
  if (hit) return hit

  try {
    const res = await fetch(req)
    if (res.ok) {
      const c = await caches.open(CACHE)
      c.put(req, res.clone())
    }
    return res
  } catch {
    return offlinePage()
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const c = await caches.open(CACHE)
      c.put(req, res.clone())
    }
    return res
  } catch {
    // 1. Exact match
    const exact = await caches.match(req)
    if (exact) return exact

    // 2. Navigation: try root, then any cached document
    if (req.mode === 'navigate' || req.destination === 'document') {
      const root = await caches.match('/')
      if (root) return root

      const c = await caches.open(CACHE)
      const keys = await c.keys()
      for (const key of keys) {
        const doc = await c.match(key)
        if (!doc) continue
        const ct = doc.headers.get('content-type') || ''
        if (ct.includes('text/html') || ct.includes('text/x-component')) {
          return doc
        }
      }
    }

    return offlinePage()
  }
}

// ─── Offline fallback page ──────────────────────────────

function offlinePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LifeOS - 当前离线</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#f8fafc;color:#0f172a;padding:1.5rem;text-align:center}
.card{max-width:360px}
.icon{font-size:3rem;margin-bottom:1rem}
h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}
p{color:#64748b;font-size:.875rem;line-height:1.5;margin-bottom:.5rem}
.hint{margin-top:1rem;padding:.75rem 1rem;background:#f1f5f9;border-radius:8px;font-size:.8125rem;color:#475569}
</style>
</head>
<body>
<div class="card">
<div class="icon">📡</div>
<h1>当前无网络连接</h1>
<p>首次使用需要联网加载数据<br>连接网络后刷新即可</p>
<div class="hint">
💡 联网加载一次后<br>再次访问即可离线查看笔记
</div>
</div>
</body>
</html>`,
    { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
  )
}
