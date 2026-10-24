import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['draft', 'published', 'paused', 'archived']).optional(),
  currency: z.enum(['EUR', 'BRL']).optional(),
  country: z.string().trim().length(2).optional(),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  canonicalUrl: z.string().trim().url().max(500).optional().nullable(),
  deliveryAssetRef: z.string().trim().max(500).optional().nullable(),
  deliveryDescription: z.string().trim().max(300).optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

/**
 * Updates a campaign. Validates slug uniqueness if changed.
 * Cannot change the slug of the default campaign (preserves / route).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.campaign.findUnique({ where: { id } }).catch(() => null)
  if (!existing) return notFound('Campanha não encontrada.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const d = parsed.data

  // If changing slug, check uniqueness + don't allow changing default's slug
  if (d.slug && d.slug !== existing.slug) {
    if (existing.isDefault) {
      return badRequest('Não é possível alterar o slug da campanha predefinida (preserva a rota /).')
    }
    const slugExists = await db.campaign.findUnique({ where: { slug: d.slug } }).catch(() => null)
    if (slugExists) {
      return badRequest('Já existe uma campanha com este slug.')
    }
  }

  // If publishing, validate required fields
  if (d.status === 'published') {
    const name = d.name ?? existing.name
    const slug = d.slug ?? existing.slug
    if (!name || !slug) {
      return badRequest('Não é possível publicar uma campanha sem nome ou slug.')
    }
  }

  const updated = await db.campaign.update({
    where: { id },
    data: {
      name: d.name,
      slug: d.slug,
      status: d.status,
      currency: d.currency,
      country: d.country,
      seoTitle: d.seoTitle !== undefined ? d.seoTitle : undefined,
      seoDescription: d.seoDescription !== undefined ? d.seoDescription : undefined,
      canonicalUrl: d.canonicalUrl !== undefined ? d.canonicalUrl : undefined,
      deliveryAssetRef: d.deliveryAssetRef !== undefined ? d.deliveryAssetRef : undefined,
      deliveryDescription: d.deliveryDescription !== undefined ? d.deliveryDescription : undefined,
    },
  }).catch(async (err) => {
    const code = (err as { code?: string })?.code
    if (code === 'P2021' || code === 'P2022') {
      // Fallback: raw UPDATE with original columns
      await db.$executeRawUnsafe(
        `UPDATE campaign SET name = $1, status = $2, updated_at = now() WHERE id = $3`,
        d.name ?? existing.name, d.status ?? existing.status, id,
      )
      return db.campaign.findUnique({ where: { id } })
    }
    throw err
  })

  await audit({
    actor: email,
    action: 'campaign_updated',
    entity: 'Campaign',
    entityId: id,
    detail: `status=${updated?.status ?? d.status} slug=${updated?.slug ?? existing.slug}`,
    ip: clientIp(req),
  })

  return json({ campaign: updated })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const existing = await db.campaign.findUnique({ where: { id } }).catch(() => null)
  if (!existing) return notFound('Campanha não encontrada.')

  // Cannot delete the default campaign
  if (existing.isDefault) {
    return badRequest('Não é possível eliminar a campanha predefinida.')
  }

  // Archive instead of delete (preserve data integrity)
  await db.campaign.update({
    where: { id },
    data: { status: 'archived' },
  }).catch(async (err) => {
    const code = (err as { code?: string })?.code
    if (code === 'P2021' || code === 'P2022') {
      await db.$executeRawUnsafe(
        `UPDATE campaign SET status = 'archived', updated_at = now() WHERE id = $1`, id,
      )
    } else {
      throw err
    }
  })

  await audit({
    actor: email,
    action: 'campaign_archived',
    entity: 'Campaign',
    entityId: id,
    ip: clientIp(req),
  })

  return json({ ok: true })
}
