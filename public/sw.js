// LifeOS Service Worker — offline caching
//
// Next.js App Router notes:
//   - Page HTML loads BEFORE SW activates → first visit never caches pages
//   - Client navigation = GET with `RSC: 1` header (same URL as page, different body)
//   - PWA start_url `/` 307-redirects to `/notes`
//
// Strategy (deliberately conservative to avoid stale-RSC breakage after deploy):
//   - Static assets (/_next/static, icons, manifest): cache-first (immutable hashes)
//   - RSC requests & /api requests: NETWORK ONLY — never cached. Caching RSC
//     across deploys causes blank screens / infinite loading on installed PWAs.
//   - Page navigations: network-first, cache on success (for offline fallback only)
//
// IMPORTANT: bump CACHE on every deploy so old cached pages are purged.

const CACHE = 'lifeos-v2'

const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

const isStatic = (p) =>
  p.startsWith('/_next/static/') ||
  p === '/manifest.json' ||
  p.startsWith('/icons/')

const isRsc = (request, url) =>
  request.headers.get('rsc') === '1' || url.searchParams.has('_rsc')

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
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await warmCache()
    })()
  )
  self.clients.claim()
})

// Proactively fetch known pages so the next offline visit works.
// Does NOT depend on clients.matchAll (often empty during activate).
async function warmCache() {
  const pages = ['/', '/notes', '/expenses', '/habits', '/settings']
  const c = await caches.open(CACHE)
  await Promise.all(pages.map(async (page) => {
    try {
      const existing = await caches.match(page)
      if (existing) return
      const res = await fetch(page, { credentials: 'same-origin' })
      if (res.ok && res.type === 'basic') {
        c.put(page, res)
      }
    } catch {
      // best-effort
    }
  }))
}

// ─── Fetch ──────────────────────────────────────────────

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Never cache API or RSC responses — they reference hashed chunks that
  // change on every deploy and would otherwise serve stale, broken shells.
  if (url.pathname.startsWith('/api/') || isRsc(request, url)) {
    e.respondWith(fetch(request))
    return
  }

  if (isStatic(url.pathname)) {
    e.respondWith(cacheFirst(request))
    return
  }

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
      // Also cache under start_url so PWA launch works offline
      if (req.mode === 'navigate' && new URL(req.url).pathname !== '/') {
        c.put('/', res.clone())
      }
    }
    return res
  } catch {
    const exact = await caches.match(req)
    if (exact) return exact

    if (req.mode === 'navigate' || req.destination === 'document') {
      const root = await caches.match('/')
      if (root) return root

      const c = await caches.open(CACHE)
      const keys = await c.keys()
      for (const key of keys) {
        const doc = await c.match(key)
        if (!doc) continue
        const ct = doc.headers.get('content-type') || ''
        if (ct.includes('text/html')) {
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
