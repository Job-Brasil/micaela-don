import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api'
import { clientIp } from '@/lib/auth'

const schema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  donorEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  donorName: z.string().trim().max(120).optional(),
  consent: z.boolean(),
})

/**
 * Records explicit, timestamped consent per channel. No outbound message may be
 * sent without a matching valid consent record (enforced by the outbound layer).
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  }
  const d = parsed.data
  const ip = clientIp(req)

  const rec = await db.consentRecord.create({
    data: {
      channel: d.channel,
      donorEmail: d.donorEmail || null,
      donorName: d.donorName || null,
      consent: d.consent,
      ip,
    },
  })

  return json({ id: rec.id, recorded: true }, { status: 201 })
}
