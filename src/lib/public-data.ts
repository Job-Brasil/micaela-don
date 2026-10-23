import { db } from '@/lib/db'

export type PublicSite = {
  campaign: {
    id: string
    slug: string
    name: string
    currency: string
    country: string
    seoTitle: string | null
    seoDescription: string | null
    canonicalUrl: string | null
  } | null
  settings: Record<string, string>
  hero: {
    layout: string
    bannerImage: string | null
    bannerAlt: string | null
    portraitImage: string | null
    portraitAlt: string | null
    storyImage: string | null
    storyAlt: string | null
  }
  payment: {
    currency: string
    holder: string
    bank: string
    iban: string
    bic: string | null
    method: string
  } | null
  paymentStatus: { approved: boolean; published: boolean; exists: boolean }
  pix: {
    available: boolean
    beneficiaryName: string | null
    qrUrl: string | null
  }
  materials: {
    id: string
    name: string
    category: string
    type: string
    url: string
    source: string
    coverImage: string | null
    coverAlt: string | null
    description: string | null
  }[]
  contactChannels: { type: string; label: string; value: string }[]
}

function resolveImageRef(ref: string | null | undefined): string | null {
  if (!ref) return null
  if (ref.startsWith('asset:')) {
    return `/api/public/asset/${ref.slice(6)}`
  }
  return ref
}

/**
 * The single source of truth for what a visitor may see.
 * Returns ONLY published + approved data. Private data never leaves here.
 *
 * Resilient to schema state: if the multi-campanha / V2 migration hasn't been
 * applied to the production DB, falls back to raw SQL selecting only the
 * columns that exist in the original schema. This allows the app to work
 * immediately after deploy, before the manual SQL migration is applied.
 */
export async function getPublicSite(_campaignId: string = 'micaela'): Promise<PublicSite> {
  try {
    // Try the Prisma (typed) path first — works if schema is fully applied.
    const campaign = await db.campaign.findUnique({ where: { id: _campaignId } }).catch(() => null)
    const settings = await db.siteSetting.findMany({ where: { campaignId: _campaignId } }).catch(async () =>
      // Fallback: unscoped (pre-migration) — campaign_id column may not exist
      db.siteSetting.findMany().catch(() => []),
    )
    const payment = await db.paymentConfig
      .findFirst({ where: { campaignId: _campaignId }, orderBy: { updatedAt: 'desc' } })
      .catch(async () =>
        db.paymentConfig.findFirst({ orderBy: { updatedAt: 'desc' } }).catch(() => null),
      )
    const pix = await db.pixConfig
      .findFirst({ where: { campaignId: _campaignId }, orderBy: { updatedAt: 'desc' } })
      .catch(async () =>
        db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } }).catch(() => null),
      )
    const materials = await db.campaignMaterial
      .findMany({ where: { campaignId: _campaignId, approved: true, published: true }, orderBy: { createdAt: 'desc' } })
      .catch(async () =>
        db.campaignMaterial.findMany({ where: { approved: true, published: true }, orderBy: { createdAt: 'desc' } }).catch(async () => {
          // Last resort: raw SQL selecting only columns that exist in original schema
          return db.$queryRawUnsafe(
            `SELECT id, name, category, type, url, source FROM campaign_material WHERE approved = true AND published = true ORDER BY created_at DESC`,
          ) as Promise<Array<{ id: string; name: string; category: string; type: string; url: string; source: string }>>
        }),
      )
    const channels = await db.contactChannel
      .findMany({ where: { campaignId: _campaignId, enabled: true, published: true } })
      .catch(async () =>
        db.contactChannel.findMany({ where: { enabled: true, published: true } }).catch(() => []),
      )

    const settingsMap = (settings as Array<{ key: string; value: string }>).reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {})

    const showPayment = !!payment && payment.published && payment.approved
    const showPix = !!pix && pix.published && pix.approved && !!pix.qrImageData

    const hero = {
      layout: settingsMap['hero.layout'] ?? 'none',
      bannerImage: resolveImageRef(settingsMap['hero.bannerImage'] ?? null),
      bannerAlt: settingsMap['hero.bannerAlt'] ?? null,
      portraitImage: resolveImageRef(settingsMap['hero.portraitImage'] ?? null),
      portraitAlt: settingsMap['hero.portraitAlt'] ?? null,
      storyImage: resolveImageRef(settingsMap['hero.storyImage'] ?? null),
      storyAlt: settingsMap['hero.storyAlt'] ?? null,
    }

    return {
      campaign: campaign
        ? {
            id: campaign.id,
            slug: campaign.slug,
            name: campaign.name,
            currency: campaign.currency,
            country: campaign.country,
            seoTitle: campaign.seoTitle,
            seoDescription: campaign.seoDescription,
            canonicalUrl: campaign.canonicalUrl,
          }
        : { id: 'micaela', slug: 'micaela', name: 'A história da Micaela', currency: 'EUR', country: 'PT', seoTitle: null, seoDescription: null, canonicalUrl: null },
      settings: settingsMap,
      hero,
      payment: showPayment
        ? {
            currency: payment!.currency,
            holder: payment!.holder,
            bank: payment!.bank,
            iban: payment!.iban,
            bic: payment!.bic ?? null,
            method: payment!.method,
          }
        : null,
      paymentStatus: payment
        ? { approved: payment.approved, published: payment.published, exists: true }
        : { approved: false, published: false, exists: false },
      pix: {
        available: showPix,
        beneficiaryName: showPix ? pix!.beneficiaryName ?? null : null,
        qrUrl: showPix ? '/api/public/pix-qr' : null,
      },
      materials: (materials as Array<Record<string, unknown>>).map((m) => ({
        id: String(m.id),
        name: String(m.name ?? ''),
        category: String(m.category ?? ''),
        type: String(m.type ?? ''),
        url: String(m.url ?? ''),
        source: String(m.source ?? 'google_drive'),
        coverImage: resolveImageRef((m.coverImageRef ?? m.cover_image_ref) as string | null | undefined),
        coverAlt: ((m.coverAlt ?? m.cover_alt) as string | null) ?? null,
        description: (m.description as string | null) ?? null,
      })),
      contactChannels: (channels as Array<{ type: string; label: string; value: string }>).map((c) => ({
        type: c.type,
        label: c.label,
        value: c.value,
      })),
    }
  } catch (err) {
    const code = (err as { code?: string })?.code ?? 'UNKNOWN'
    const name = (err as { name?: string })?.name ?? 'Error'
    const msg = (err as { message?: string })?.message ?? ''
    const safeMsg = msg.replace(/(?:postgres(?:ql)?|file):\/\/[^\s]+/gi, '[REDACTED_URL]')
    console.error('[getPublicSite] DB error:', { code, name, message: safeMsg })
    return EMPTY_PUBLIC_SITE
  }
}

export async function getCampaignIdBySlug(slug: string): Promise<string | null> {
  try {
    const campaign = await db.campaign.findUnique({
      where: { slug },
      select: { id: true, status: true },
    })
    if (!campaign || campaign.status !== 'published') return null
    return campaign.id
  } catch {
    return slug === 'micaela' ? 'micaela' : null
  }
}

const EMPTY_PUBLIC_SITE: PublicSite = {
  campaign: null,
  settings: {},
  hero: {
    layout: 'none',
    bannerImage: null,
    bannerAlt: null,
    portraitImage: null,
    portraitAlt: null,
    storyImage: null,
    storyAlt: null,
  },
  payment: null,
  paymentStatus: { approved: false, published: false, exists: false },
  pix: { available: false, beneficiaryName: null, qrUrl: null },
  materials: [],
  contactChannels: [],
}
