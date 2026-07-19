import { NextResponse } from 'next/server'
import { deriveToken } from '@/lib/auth-token'

// In-memory fixed-window rate limiter keyed by client IP.
// NOTE: state is per-process only; it won't be shared across serverless
// instances. Acceptable for a single-instance personal app.
const MAX_ATTEMPTS = 10
const WINDOW_MS = 5 * 60 * 1000
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for may be a comma-separated list; take the first hop.
    return forwarded.split(',')[0]!.trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.APP_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: true })
  }

  const clientIp = getClientIp(req)
  const bucket = rateBuckets.get(clientIp)
  if (bucket && Date.now() < bucket.resetAt && bucket.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: '尝试次数过多，请稍后再试' },
      { status: 429, headers: { 'Retry-After': '300' } }
    )
  }

  // Constant-time compare of the submitted password.
  const ok = password.length === expected.length &&
    timingSafeEqual(password, expected)
  if (!ok) {
    const now = Date.now()
    const existing = rateBuckets.get(clientIp)
    if (!existing || now >= existing.resetAt) {
      rateBuckets.set(clientIp, { count: 1, resetAt: now + WINDOW_MS })
    } else {
      existing.count++
    }
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  // Successful login clears any penalty for this IP.
  rateBuckets.delete(clientIp)

  const token = await deriveToken()
  const res = NextResponse.json({ ok: true })
  // Secure 仅在 HTTPS 下生效；自托管经 http://IP:3000 访问时若强制 Secure，
  // 浏览器不会回传 cookie，导致登录后跳回登录页。用 COOKIE_SECURE 显式控制。
  const secure = process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false')
  // The cookie holds a password-derived HMAC token, NOT the plaintext password.
  res.cookies.set('app_auth', token ?? '', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure,
    httpOnly: true,
  })
  return res
}

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}
