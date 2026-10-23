import { db } from '@/lib/db'

export type PublicSite = {
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
 * The single source of truth for what a visitor may see.
 * Returns ONLY published + approved data. Private data never leaves here.
 */
export async function getPublicSite(): Promise<PublicSite> {
  try {
    // Run queries SEQUENTIALLY (PgBouncer connection_limit=1).
    const settings = await db.siteSetting.findMany()
    const payment = await db.paymentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
    const pix = await db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
    const materials = await db.campaignMaterial.findMany({
      where: { approved: true, published: true },
      orderBy: { createdAt: 'desc' },
    })
    const channels = await db.contactChannel.findMany({ where: { enabled: true, published: true } })

    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {})

    const showPayment = !!payment && payment.published && payment.approved
    const showPix = !!pix && pix.published && pix.approved && !!pix.qrImageData

    // Hero config from settings
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

const EMPTY_PUBLIC_SITE: PublicSite = {
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
