import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const templates = await db.thankYouTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  return json({ templates })
}

const postSchema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  language: z.string().trim().max(8).default('pt'),
  subject: z.string().trim().max(160).optional().nullable(),
  body: z.string().trim().min(1).max(2000),
  active: z.boolean().default(true),
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
  const t = await db.thankYouTemplate.create({ data: parsed.data })
  await audit({
    actor: email,
    action: 'template_created',
    entity: 'ThankYouTemplate',
    entityId: t.id,
    ip: clientIp(req),
  })
  return json({ template: t }, { status: 201 })
}
