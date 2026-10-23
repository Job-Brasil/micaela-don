import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'

/**
 * Digital delivery layer — server-only.
 *
 * Creates unpredictable, expiring delivery links associated with a confirmed order.
 * Links are served via /api/delivery/[token] which validates:
 *   - token exists
 *   - not expired
 *   - not already consumed (one-time use by default)
 *   - the associated order is 'paid'
 *
 * If no digital content is configured for the campaign, only the email is sent.
 * Digital content is OPTIONAL per campaign.
 */

const DEFAULT_EXPIRY_HOURS = 72
const DEFAULT_TOKEN_BYTES = 24 // 192 bits of entropy

/**
 * Generates an unpredictable delivery token.
 */
function generateToken(): string {
  return randomBytes(DEFAULT_TOKEN_BYTES).toString('base64url')
}

/**
 * Creates a delivery link for a confirmed order.
 * The link expires after DEFAULT_EXPIRY_HOURS.
 *
 * @param orderId - the PaymentOrder id (must be 'paid')
 * @param assetRef - reference to the asset (asset:id, storage path, or external URL)
 * @param expiryHours - custom expiry (default 72h)
 */
export async function createDeliveryLink(
  orderId: string,
  assetRef: string,
  expiryHours: number = DEFAULT_EXPIRY_HOURS,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

  await db.deliveryLink.create({
    data: {
      orderId,
      token,
      assetRef,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Validates a delivery token and returns the asset reference if valid.
 * Marks the link as consumed (one-time use).
 *
 * Returns null if:
 *   - token not found
 *   - expired
 *   - already consumed
 *   - associated order is not 'paid'
 */
export async function consumeDeliveryLink(token: string): Promise<{
  assetRef: string
  orderId: string
} | null> {
  const link = await db.deliveryLink.findUnique({
    where: { token },
  })
  if (!link) return null

  // Check expiry
  if (link.expiresAt < new Date()) return null

  // Check not already consumed (one-time use)
  if (link.consumedAt) return null

  // Verify the associated order is paid
  const order = await db.paymentOrder.findUnique({
    where: { id: link.orderId },
    select: { status: true },
  })
  if (!order || order.status !== 'paid') return null

  // Mark as consumed
  await db.deliveryLink.update({
    where: { id: link.id },
    data: { consumedAt: new Date() },
  })

  return { assetRef: link.assetRef, orderId: link.orderId }
}

/**
 * Peeks at a delivery link WITHOUT consuming it (for preview/status).
 */
export async function peekDeliveryLink(token: string): Promise<{
  valid: boolean
  expired: boolean
  consumed: boolean
  paid: boolean
} | null> {
  const link = await db.deliveryLink.findUnique({
    where: { token },
  })
  if (!link) return null

  const expired = link.expiresAt < new Date()
  const consumed = !!link.consumedAt
  const order = await db.paymentOrder.findUnique({
    where: { id: link.orderId },
    select: { status: true },
  })
  const paid = order?.status === 'paid'

  return {
    valid: !expired && !consumed && paid,
    expired,
    consumed,
    paid,
  }
}
