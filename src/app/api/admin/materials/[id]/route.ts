import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  category: z.enum(['foto', 'video', 'documento', 'logo', 'audio', 'outro']).optional(),
  type: z.string().trim().max(80).optional(),
  url: z.string().trim().url().max(500).optional(),
  source: z.string().trim().max(40).optional(),
  approved: z.boolean().optional(),
  published: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.campaignMaterial.findUnique({ where: { id } })
  if (!existing) return notFound('Material não encontrado.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const d = parsed.data

  const approved = d.approved ?? existing.approved
  const published = d.published ?? existing.published
  // Guardrail: cannot publish without approval.
  if (published && !approved) return badRequest('Não pode publicar sem aprovação.')

  const m = await db.campaignMaterial.update({
    where: { id },
    data: {
      name: d.name,
      category: d.category,
      type: d.type,
      url: d.url,
      source: d.source,
      approved,
      published,
      approvedById: approved ? email : existing.approvedById,
      approvedAt: approved ? (existing.approvedAt ?? new Date()) : existing.approvedAt,
      notes: d.notes !== undefined ? d.notes : existing.notes,
    },
  })
  await audit({
    actor: email,
    action: 'material_updated',
    entity: 'CampaignMaterial',
    entityId: m.id,
    detail: `approved=${m.approved} published=${m.published}`,
    ip: clientIp(req),
  })
  return json({ material: m })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.campaignMaterial.findUnique({ where: { id } })
  if (!existing) return notFound('Material não encontrado.')
  await db.campaignMaterial.delete({ where: { id } })
  await audit({
    actor: email,
    action: 'material_deleted',
    entity: 'CampaignMaterial',
    entityId: id,
    ip: clientIp(req),
  })
  return json({ ok: true })
}

export async function GET(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const m = await db.campaignMaterial.findUnique({ where: { id } })
  if (!m) return notFound('Material não encontrado.')
  return json({ material: m })
}
