import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, unauthorized } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'

/**
 * Outbound message queue (future WhatsApp Business / email integration).
 * Read-only here. Sending is intentionally a no-op until an official integration
 * is validated. Cancel is allowed via PATCH on [id].
 */
export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const messages = await db.outboundMessage.findMany({ orderBy: { createdAt: 'desc' } })
  return json({ messages })
}
