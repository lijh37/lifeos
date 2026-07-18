import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.APP_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: true })
  }

  if (password === expected) {
    const res = NextResponse.json({ ok: true })
    const secure = process.env.NODE_ENV === 'production'
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
