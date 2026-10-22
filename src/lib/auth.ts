import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Admin authentication — server-only.
 *
 * Design:
 *  - Admin email + scrypt password hash live in env (never in code/git, never on client).
 *  - On login we verify the password with scrypt, then issue an HMAC-signed session cookie
 *    (httpOnly, sameSite=lax) carrying {email, exp}.
 *  - requireAdmin() verifies the HMAC + expiry on every protected request.
 *
 * This is deliberately a single-admin scheme (the campaign has one authorized admin).
 * It is NOT a general-purpose auth system.
 */

const COOKIE_NAME = 'micaela_admin'
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12h

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32 || s.startsWith('replace')) {
    throw new Error('SESSION_SECRET not configured (must be >=32 chars).')
  }
  return s
}

function getAdminEmail(): string {
  const e = process.env.ADMIN_EMAIL
  if (!e) throw new Error('ADMIN_EMAIL not configured.')
  return e
}

/**
 * Verify a plaintext password against ADMIN_PASSWORD_HASH env value.
 * Format: "scrypt:<saltHex>:<hashHex>" or legacy "scrypt:<hashHex>" (salted preferred).
 */
export async function verifyAdminPassword(plain: string): Promise<boolean> {
  const stored = process.env.ADMIN_PASSWORD_HASH
  if (!stored || stored.includes('placeholder')) {
    // Bootstrap mode: if no real hash is set yet, refuse all logins.
    return false
  }
  const parts = stored.split(':')
  if (parts[0] !== 'scrypt') return false

  let saltHex: string
  let hashHex: string
  if (parts.length === 3) {
    ;[saltHex, hashHex] = [parts[1], parts[2]]
  } else if (parts.length === 2) {
    // unsalted legacy — not recommended, but supported
    saltHex = ''
    hashHex = parts[1]
  } else {
    return false
  }

  const salt = saltHex ? Buffer.from(saltHex, 'hex') : Buffer.alloc(0)
  const expected = Buffer.from(hashHex, 'hex')

  return new Promise<boolean>((resolve) => {
    scrypt(plain, salt, expected.length, (err, derived) => {
      if (err) return resolve(false)
      if (derived.length !== expected.length) return resolve(false)
      resolve(timingSafeEqual(derived, expected))
    })
  })
}

async function hmac(data: string): Promise<string> {
  const { createHmac } = await import('node:crypto')
  return createHmac('sha256', getSecret()).update(data).digest('hex')
}

export async function createSessionCookie(): Promise<{ name: string; value: string; maxAge: number }> {
  const email = getAdminEmail()
  const exp = Date.now() + SESSION_TTL_MS
  // Encode payload as base64url JSON so the value never relies on a '.' delimiter
  // inside user-controlled fields (an email like "admin@micaela.local" contains dots).
  const payload = JSON.stringify({ email, exp })
  const b64 = Buffer.from(payload).toString('base64url')
  const sig = await hmac(b64)
  const value = `${b64}.${sig}`
  return { name: COOKIE_NAME, value, maxAge: SESSION_TTL_MS / 1000 }
}

export async function verifySession(value: string | undefined | null): Promise<boolean> {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 2) return false
  const [b64, sig] = parts
  const expectedSig = await hmac(b64)
  if (sig.length !== expectedSig.length) return false
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  let payload: { email?: string; exp?: number }
  try {
    payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
  } catch {
    return false
  }
  const exp = Number(payload.exp)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  if (payload.email !== getAdminEmail()) return false
  return true
}

export const ADMIN_COOKIE = COOKIE_NAME

/**
 * Returns the admin email if the current request carries a valid admin session,
 * otherwise null. Use in API route handlers to gate mutations.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value
  const ok = await verifySession(value)
  return ok ? getAdminEmail() : null
}

export function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const xreal = req.headers.get('x-real-ip')
  if (xreal) return xreal.trim()
  return null
}

/** Helper to hash a password for the ADMIN_PASSWORD_HASH env value. Used by scripts. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  // scrypt is async in node, but we expose a sync wrapper via scryptSync.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { scryptSync } = require('node:crypto')
  const hash = scryptSync(plain, salt, 32)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}
