import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

/**
 * Lists all campaigns (admin only). Returns all fields including draft/archived.
 */
export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: 'asc' },
  }).catch(async () =>
    // Fallback: raw SQL if campaign_id column missing (pre-migration)
    db.$queryRawUnsafe(
      'SELECT id, slug, name, status, is_default, currency, country, seo_title, seo_description, canonical_url, created_at, updated_at FROM campaign ORDER BY created_at ASC',
    ) as Promise<unknown[]>,
  )
  return json({ campaigns })
}

const RESERVED_SLUGS = new Set(['api', 'admin', '_next', 'favicon.ico', 'icon.svg', 'robots.txt', 'sitemap.xml', 'pagamento', 'micaela'])

const postSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  name: z.string().trim().min(1).max(120),
  status: z.enum(['draft', 'published', 'paused', 'archived']).default('draft'),
  currency: z.enum(['EUR', 'BRL']).default('EUR'),
  country: z.string().trim().length(2).default('PT'),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  canonicalUrl: z.string().trim().url().max(500).optional().nullable(),
  deliveryAssetRef: z.string().trim().max(500).optional().nullable(),
  deliveryDescription: z.string().trim().max(300).optional().nullable(),
})

/**
 * Creates a new campaign. Validates slug uniqueness and reserved slugs.
 */
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

  // Reserved slug check
  if (RESERVED_SLUGS.has(d.slug)) {
    return badRequest('Este slug está reservado e não pode ser usado.')
  }

  // Uniqueness check
  const existing = await db.campaign.findUnique({ where: { slug: d.slug } }).catch(() => null)
  if (existing) {
    return badRequest('Já existe uma campanha com este slug.')
  }

  // Cannot have two defaults
  if (d.status === 'published') {
    const defaultCampaign = await db.campaign.findFirst({ where: { isDefault: true } }).catch(() => null)
    // It's OK to have the default be this one; just don't create a second default
  }

  const campaign = await db.campaign.create({
    data: {
      slug: d.slug,
      name: d.name,
      status: d.status,
      currency: d.currency,
      country: d.country,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      canonicalUrl: d.canonicalUrl ?? null,
      deliveryAssetRef: d.deliveryAssetRef ?? null,
      deliveryDescription: d.deliveryDescription ?? null,
    },
  }).catch(async (err) => {
    const code = (err as { code?: string })?.code
    if (code === 'P2021' || code === 'P2022') {
      // Fallback: raw INSERT (pre-migration columns missing)
      const rows = await db.$queryRawUnsafe(
        `INSERT INTO campaign (id, slug, name, status, is_default, currency, country, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, false, $4, $5, now(), now())
         RETURNING id, slug, name, status`,
        d.slug, d.name, d.status, d.currency, d.country,
      ) as Array<{ id: string; slug: string; name: string; status: string }>
      return rows[0]
    }
    throw err
  })

  await audit({
    actor: email,
    action: 'campaign_created',
    entity: 'Campaign',
    entityId: campaign.id,
    detail: `slug=${d.slug} name=${d.name} status=${d.status}`,
    ip: clientIp(req),
  })

  return json({ campaign }, { status: 201 })
}
