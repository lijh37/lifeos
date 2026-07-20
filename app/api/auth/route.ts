import { NextResponse } from 'next/server'
import { deriveToken } from '@/lib/auth-token'

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.APP_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: true })
  }

  // Constant-time compare of the submitted password.
  if (!timingSafeEqual(password, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

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
