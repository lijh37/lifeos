// Shared auth-token logic for the password-gated personal app.
//
// The cookie/token is NOT the plaintext password. It is a deterministic
// HMAC derived from APP_PASSWORD, so:
//   - reading the cookie does not reveal the password
//   - the token is stateless (no session store) and rotates if the password changes
//   - middleware can verify it without hitting a database
//
// Works in both the Node route handler and the Edge middleware because it
// uses the Web Crypto API (crypto.subtle), available in both runtimes.

const enc = new TextEncoder()

function getSecret(): string | undefined {
  return process.env.APP_PASSWORD
}

// Derive a stable token from the configured password.
// Returns null when no password is configured (auth disabled).
export async function deriveToken(): Promise<string | null> {
  const secret = getSecret()
  if (!secret) return null
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(secret))
  return bufferToHex(sig)
}

// Constant-time verification of a presented token against the derived token.
export async function verifyToken(presented: string | undefined): Promise<boolean> {
  if (!presented) return false
  const expected = await deriveToken()
  if (!expected) return false
  if (presented.length !== expected.length) return false
  const a = enc.encode(presented)
  const b = enc.encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
