import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth-token'

/**
 * Re-verify the app_auth cookie or Bearer token inside an API route.
 * Returns true when auth is disabled (APP_PASSWORD unset) OR a valid token is present.
 * Mirrors proxy.ts logic so routes have defense-in-depth independent of middleware.
 */
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (!process.env.APP_PASSWORD) return true
  const cookieToken = req.cookies.get('app_auth')?.value
  if (await verifyToken(cookieToken)) return true
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    if (await verifyToken(authHeader.slice(7))) return true
  }
  return false
}
