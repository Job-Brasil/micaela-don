import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const putSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  value: z.string().trim().min(1).max(300).optional(),
  enabled: z.boolean().optional(),
  published: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.contactChannel.findUnique({ where: { id } })
  if (!existing) return notFound('Canal não encontrado.')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const enabled = parsed.data.enabled ?? existing.enabled
  const published = parsed.data.published ?? existing.published
  // Guardrail: cannot publish a disabled channel.
  if (published && !enabled)
    return badRequest('Não pode publicar um canal desativado. Ative-o primeiro.')
  const c = await db.contactChannel.update({
    where: { id },
    data: {
      label: parsed.data.label,
      value: parsed.data.value,
      enabled,
      published,
    },
  })
  await audit({
    actor: email,
    action: 'contact_channel_updated',
    entity: 'ContactChannel',
    entityId: c.id,
    detail: `enabled=${c.enabled} published=${c.published}`,
    ip: clientIp(req),
  })
  return json({ channel: c })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.contactChannel.findUnique({ where: { id } })
  if (!existing) return notFound('Canal não encontrado.')
  await db.contactChannel.delete({ where: { id } })
  await audit({
    actor: email,
    action: 'contact_channel_deleted',
    entity: 'ContactChannel',
    entityId: id,
    ip: clientIp(req),
  })
  return json({ ok: true })
}
