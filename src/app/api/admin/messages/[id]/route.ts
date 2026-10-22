import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const patchSchema = z.object({
  status: z.enum(['pending', 'queued', 'sent', 'failed', 'cancelled']).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.outboundMessage.findUnique({ where: { id } })
  if (!existing) return notFound('Mensagem não encontrada.')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const updated = await db.outboundMessage.update({ where: { id }, data: { status: parsed.data.status } })
  await audit({
    actor: email,
    action: 'message_status_updated',
    entity: 'OutboundMessage',
    entityId: id,
    detail: `status=${updated.status}`,
    ip: clientIp(req),
  })
  return json({ message: updated })
}
