import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth-token'

const PASSWORD_COOKIE = 'app_auth'

const publicPaths = [
  '/login',
  '/api/auth',
  '/manifest.json',
  '/icons/',
  '/uploads/',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const expected = process.env.APP_PASSWORD
  if (!expected) return NextResponse.next()

  // The cookie holds a password-derived HMAC token, not the plaintext password.
  const cookieToken = request.cookies.get(PASSWORD_COOKIE)?.value
  if (await verifyToken(cookieToken)) return NextResponse.next()

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (await verifyToken(token)) return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
