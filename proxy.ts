import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PASSWORD_COOKIE = 'app_auth'

const publicPaths = [
  '/login',
  '/api/auth',
  '/manifest.json',
  '/sw.js',
  '/icons/',
  '/ca.pem',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const password = request.cookies.get(PASSWORD_COOKIE)?.value
  const expected = process.env.APP_PASSWORD

  if (expected && password !== expected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
