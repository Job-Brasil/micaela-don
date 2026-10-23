import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const patchSchema = z.object({
  // Administrative confirmation. A submitted form is NOT proof of payment.
  status: z.enum(['received', 'under_review', 'confirmed', 'rejected']).optional(),
  confirmed: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.donationIntent.findUnique({ where: { id } })
  if (!existing) return notFound('Donativo não encontrado.')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const d = parsed.data

  const confirmed = d.confirmed ?? existing.confirmed
  const status = d.status ?? (confirmed ? 'confirmed' : existing.status)

  const updated = await db.donationIntent.update({
    where: { id },
    data: {
      status,
      confirmed,
      confirmedAt: confirmed ? (existing.confirmedAt ?? new Date()) : existing.confirmedAt,
      confirmedById: confirmed ? email : existing.confirmedById,
    },
  })

  await audit({
    actor: email,
    action: 'donation_updated',
    entity: 'DonationIntent',
    entityId: id,
    detail: `status=${updated.status} confirmed=${updated.confirmed}`,
    ip: clientIp(req),
  })
  return json({ donation: updated })
}
