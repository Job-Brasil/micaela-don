import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const channels = await db.contactChannel.findMany({ orderBy: { createdAt: 'asc' } })
  return json({ channels })
}

const postSchema = z.object({
  type: z.enum(['email', 'whatsapp']),
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(300),
  enabled: z.boolean().default(false),
  published: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  // Guardrail: a channel may only be published if enabled.
  if (parsed.data.published && !parsed.data.enabled)
    return badRequest('Não pode publicar um canal desativado.')
  const c = await db.contactChannel.create({ data: parsed.data })
  await audit({
    actor: email,
    action: 'contact_channel_created',
    entity: 'ContactChannel',
    entityId: c.id,
    detail: `${c.type}:${c.label} enabled=${c.enabled} published=${c.published}`,
    ip: clientIp(req),
  })
  return json({ channel: c }, { status: 201 })
}
