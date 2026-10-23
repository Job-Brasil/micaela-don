import { createHash, timingSafeEqual, createHmac } from 'node:crypto'

/**
 * Webhook signature verification helpers.
 *
 * - Stripe: uses the Stripe SDK's built-in signature verification (constructEvent).
 * - PixGo: HMAC-SHA256 over `{timestamp}.{rawBody}`, compared in constant time.
 */

/**
 * Verifies a PixGo webhook signature.
 *
 * According to PixGo docs, the signature is HMAC-SHA256 computed over
 * `{X-Webhook-Timestamp}.{rawBody}` using the webhook secret.
 *
 * @param rawBody The raw request body (string)
 * @param timestamp The X-Webhook-Timestamp header value
 * @param signature The X-Webhook-Signature header value (hex)
 * @param secret The PIXGO_WEBHOOK_SECRET env value
 * @returns true if the signature is valid
 */
export function verifyPixGoSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody || !timestamp || !signature || !secret) return false
  const payload = `${timestamp}.${rawBody}`
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex')
  // Constant-time comparison
  if (signature.length !== expectedSig.length) return false
  const a = Buffer.from(signature, 'hex')
  const b = Buffer.from(expectedSig, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Checks if a webhook timestamp is within the acceptable tolerance window.
 * Prevents replay attacks using old timestamps.
 *
 * @param timestamp Unix timestamp string (seconds)
 * @param toleranceSeconds Maximum age allowed (default 300 = 5 minutes)
 * @returns true if the timestamp is within tolerance
 */
export function isTimestampWithinTolerance(
  timestamp: string,
  toleranceSeconds: number = 300,
): boolean {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const now = Math.floor(Date.now() / 1000)
  const age = Math.abs(now - ts)
  return age <= toleranceSeconds
}

/**
 * Computes a SHA-256 hash of a payload for audit/storage purposes.
 */
export function hashPayload(rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex')
}
