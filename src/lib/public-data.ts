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

/**
 * Resolves a cover image reference to a URL.
 * - If it starts with "asset:", it's a SiteAsset id → /api/public/asset/[id]
 * - Otherwise it's treated as an external URL
 */
function resolveImageRef(ref: string | null | undefined): string | null {
  if (!ref) return null
  if (ref.startsWith('asset:')) {
    return `/api/public/asset/${ref.slice(6)}`
  }
  return ref
}

/**
 * Checks whether the campaign_id column exists on a table by attempting a query.
 * If it fails with P2021 (table/column missing), the migration B hasn't been
 * applied yet and we fall back to unscoped queries (backward compatible with
 * the pre-multi-campanha production schema).
 *
 * This makes the app resilient: it works immediately after deploy, even before
 * the Supabase migration is applied manually.
 */
async function hasCampaignId(tableName: 'site_setting' | 'payment_config' | 'pix_config' | 'campaign_material' | 'contact_channel'): Promise<boolean> {
  try {
    // Try a minimal query selecting campaign_id; if the column doesn't exist,
    // Prisma throws P2021.
    await db.$queryRawUnsafe(`SELECT campaign_id FROM ${tableName} LIMIT 0`)
    return true
  } catch {
    return false
  }
}

/**
 * Checks whether the campaign table exists.
 */
async function hasCampaignTable(): Promise<boolean> {
  try {
    await db.$queryRawUnsafe(`SELECT id FROM campaign LIMIT 0`)
    return true
  } catch {
    return false
  }
}

/**
 * The single source of truth for what a visitor may see for a given campaign.
 * Returns ONLY published + approved data. Private data never leaves here.
 *
 * Resilient: if the multi-campanha migration (campaign table / campaign_id columns)
 * hasn't been applied to the production DB yet, falls back to unscoped queries
 * (returns all published data, which for the Micaela-only DB is correct).
 *
 * @param campaignId - defaults to 'micaela' (the default campaign served at "/")
 */
export async function getPublicSite(campaignId: string = 'micaela'): Promise<PublicSite> {
  try {
    // Check if the multi-campanha schema is applied
    const [hasCampaign, hasCampaignIdCol] = await Promise.all([
      hasCampaignTable(),
      hasCampaignId('site_setting'),
    ])
    const isMultiCampaign = hasCampaign && hasCampaignIdCol

    // Run queries SEQUENTIALLY (PgBouncer connection_limit=1).
    type CampaignType = NonNullable<Awaited<ReturnType<typeof db.campaign.findUnique>>>
    let campaign: CampaignType | null = null
    if (isMultiCampaign) {
      campaign = await db.campaign.findUnique({ where: { id: campaignId } })
    }

    // For queries with campaignId filter: only apply if multi-campaign schema exists.
    // Otherwise, query without the filter (returns all published data).
    const settingsWhere = isMultiCampaign ? { campaignId } : {}
    const paymentWhere = isMultiCampaign ? { campaignId } : {}
    const pixWhere = isMultiCampaign ? { campaignId } : {}
    const materialsWhere = isMultiCampaign
      ? { campaignId, approved: true, published: true }
      : { approved: true, published: true }
    const channelsWhere = isMultiCampaign
      ? { campaignId, enabled: true, published: true }
      : { enabled: true, published: true }

    const settings = await db.siteSetting.findMany({ where: settingsWhere as never })
    const payment = await db.paymentConfig.findFirst({
      where: paymentWhere as never,
      orderBy: { updatedAt: 'desc' },
    })
    const pix = await db.pixConfig.findFirst({
      where: pixWhere as never,
      orderBy: { updatedAt: 'desc' },
    })
    const materials = await db.campaignMaterial.findMany({
      where: materialsWhere as never,
      orderBy: { createdAt: 'desc' },
    })
    const channels = await db.contactChannel.findMany({ where: channelsWhere as never })

    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
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
        : // Fallback: if multi-campaign not active, synthesize a minimal campaign object
          isMultiCampaign
          ? null
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
      materials: materials.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        type: m.type,
        url: m.url,
        source: m.source,
        coverImage: resolveImageRef(m.coverImageRef),
        coverAlt: m.coverAlt ?? null,
        description: m.description ?? null,
      })),
      contactChannels: channels.map((c) => ({ type: c.type, label: c.label, value: c.value })),
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

/**
 * Resolve a campaign by slug. Returns the campaign id if found and published,
 * otherwise null. Used by the /{slug} dynamic route.
 *
 * Resilient: returns null if the campaign table doesn't exist (migration not applied).
 */
export async function getCampaignIdBySlug(slug: string): Promise<string | null> {
  try {
    const campaign = await db.campaign.findUnique({
      where: { slug },
      select: { id: true, status: true },
    })
    if (!campaign || campaign.status !== 'published') return null
    return campaign.id
  } catch {
    // Table doesn't exist or query failed — only the default campaign is available
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
