import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.APP_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: true })
  }

  if (password === expected) {
    const res = NextResponse.json({ ok: true })
    // Secure 仅在 HTTPS 下生效；自托管经 http://IP:3000 访问时若强制 Secure，
    // 浏览器不会回传 cookie，导致登录后跳回登录页。用 COOKIE_SECURE 显式控制。
    const secure = process.env.COOKIE_SECURE === 'true' ||
      (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false')
    res.cookies.set('app_auth', password, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      secure,
      httpOnly: true,
    })
    return res
  }

  return NextResponse.json({ ok: false }, { status: 401 })
}
