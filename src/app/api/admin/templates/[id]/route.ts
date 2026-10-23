import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const putSchema = z.object({
  channel: z.enum(['email', 'whatsapp']).optional(),
  language: z.string().trim().max(8).optional(),
  subject: z.string().trim().max(160).optional().nullable(),
  body: z.string().trim().min(1).max(2000).optional(),
  active: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.thankYouTemplate.findUnique({ where: { id } })
  if (!existing) return notFound('Modelo não encontrado.')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const t = await db.thankYouTemplate.update({ where: { id }, data: parsed.data })
  await audit({
    actor: email,
    action: 'template_updated',
    entity: 'ThankYouTemplate',
    entityId: t.id,
    ip: clientIp(req),
  })
  return json({ template: t })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.thankYouTemplate.findUnique({ where: { id } })
  if (!existing) return notFound('Modelo não encontrado.')
  await db.thankYouTemplate.delete({ where: { id } })
  await audit({
    actor: email,
    action: 'template_deleted',
    entity: 'ThankYouTemplate',
    entityId: id,
    ip: clientIp(req),
  })
  return json({ ok: true })
}
