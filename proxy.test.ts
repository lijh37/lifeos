import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { proxy } from '@/proxy'

// Minimal NextRequest stub — only the surface proxy.ts touches.
function makeRequest(pathname: string, opts: {
  cookie?: string
  authHeader?: string
} = {}) {
  const url = new URL(`http://localhost${pathname}`)
  return {
    nextUrl: url,
    url: url.toString(),
    cookies: {
      get(name: string) {
        if (name === 'app_auth') return opts.cookie ? { value: opts.cookie } : undefined
        return undefined
      },
    },
    headers: {
      get(name: string) {
        if (name.toLowerCase() === 'authorization') return opts.authHeader ?? null
        return null
      },
    },
  } as any
}

// Derive the expected token the same way the app does (HMAC of APP_PASSWORD).
async function deriveToken(password: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(password))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('proxy middleware', () => {
  const ORIGINAL = process.env.APP_PASSWORD

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.APP_PASSWORD
    else process.env.APP_PASSWORD = ORIGINAL
  })

  it('allows public paths without auth', async () => {
    process.env.APP_PASSWORD = 'secret'
    const res = await proxy(makeRequest('/login'))
    expect(res.status).toBe(200) // NextResponse.next()
  })

  it('allows requests when APP_PASSWORD is unset (auth disabled)', async () => {
    delete process.env.APP_PASSWORD
    const res = await proxy(makeRequest('/notes'))
    expect(res.status).toBe(200)
  })

  it('redirects unauthenticated page navigation to /login', async () => {
    process.env.APP_PASSWORD = 'secret'
    const res = await proxy(makeRequest('/notes'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('returns 401 for unauthenticated API request', async () => {
    process.env.APP_PASSWORD = 'secret'
    const res = await proxy(makeRequest('/api/notes'))
    expect(res.status).toBe(401)
  })

  it('allows valid token cookie', async () => {
    process.env.APP_PASSWORD = 'secret'
    const token = await deriveToken('secret')
    const res = await proxy(makeRequest('/notes', { cookie: token }))
    expect(res.status).toBe(200)
  })

  it('allows valid Bearer token', async () => {
    process.env.APP_PASSWORD = 'secret'
    const token = await deriveToken('secret')
    const res = await proxy(makeRequest('/api/notes', { authHeader: `Bearer ${token}` }))
    expect(res.status).toBe(200)
  })

  it('blocks wrong token cookie', async () => {
    process.env.APP_PASSWORD = 'secret'
    const res = await proxy(makeRequest('/notes', { cookie: 'wrong-token' }))
    expect(res.status).toBe(307)
  })

  it('blocks cookie equal to the plaintext password (regression guard)', async () => {
    process.env.APP_PASSWORD = 'secret'
    // The cookie must NOT be the password itself.
    const res = await proxy(makeRequest('/notes', { cookie: 'secret' }))
    expect(res.status).toBe(307)
  })

  it('blocks wrong Bearer token', async () => {
    process.env.APP_PASSWORD = 'secret'
    const res = await proxy(makeRequest('/api/notes', { authHeader: 'Bearer nope' }))
    expect(res.status).toBe(401)
  })

  it('bypasses static assets and dot-paths', async () => {
    process.env.APP_PASSWORD = 'secret'
    expect((await proxy(makeRequest('/_next/static/app.js'))).status).toBe(200)
    expect((await proxy(makeRequest('/favicon.ico'))).status).toBe(200)
  })
})
