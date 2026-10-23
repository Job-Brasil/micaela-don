import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const materials = await db.campaignMaterial.findMany({ orderBy: { createdAt: 'desc' } })
  return json({ materials })
}

const postSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum(['foto', 'video', 'documento', 'logo', 'audio', 'outro']),
  type: z.string().trim().max(80),
  url: z.string().trim().url().max(500),
  source: z.string().trim().max(40).optional(),
  coverImageRef: z.string().trim().max(500).optional().nullable(),
  coverAlt: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
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
  const d = parsed.data
  // New materials are always created as unapproved + unpublished.
  const m = await db.campaignMaterial.create({
    data: {
      name: d.name,
      category: d.category,
      type: d.type,
      url: d.url,
      source: d.source ?? 'google_drive',
      coverImageRef: d.coverImageRef ?? null,
      coverAlt: d.coverAlt ?? null,
      description: d.description ?? null,
      published: false,
      approved: false,
      notes: d.notes ?? null,
    },
  })
  await audit({
    actor: email,
    action: 'material_created',
    entity: 'CampaignMaterial',
    entityId: m.id,
    detail: `${d.category}:${d.name}`,
    ip: clientIp(req),
  })
  return json({ material: m }, { status: 201 })
}
