import { db } from '@/lib/db'

export type PublicSite = {
  settings: Record<string, string>
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
  }[]
  contactChannels: { type: string; label: string; value: string }[]
}

/**
 * The single source of truth for what a visitor may see.
 * Returns ONLY published + approved data. Private data never leaves here.
 *
 * Defensive: if the database is unreachable, returns a safe fallback (empty data)
 * so the page renders instead of showing "Application error". The error is logged
 * server-side (sanitized — no connection strings) for diagnosis.
 */
export async function getPublicSite(): Promise<PublicSite> {
  try {
    // Run queries SEQUENTIALLY (not Promise.all) because Supabase's PgBouncer
    // pool uses connection_limit=1. Concurrent queries on a single pooled
    // connection can fail with timeout or "prepared statement" errors.
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

    return {
      settings: settingsMap,
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
      })),
      contactChannels: channels.map((c) => ({ type: c.type, label: c.label, value: c.value })),
    }
  } catch (err) {
    // Sanitized error logging — never log the DATABASE_URL or connection string.
    const code = (err as { code?: string })?.code ?? 'UNKNOWN'
    const name = (err as { name?: string })?.name ?? 'Error'
    const msg = (err as { message?: string })?.message ?? ''
    // Strip any potential URL/credential from the message
    const safeMsg = msg.replace(/(?:postgres(?:ql)?|file):\/\/[^\s]+/gi, '[REDACTED_URL]')
    console.error('[getPublicSite] DB error:', { code, name, message: safeMsg })
    return EMPTY_PUBLIC_SITE
  }
}

const EMPTY_PUBLIC_SITE: PublicSite = {
  settings: {},
  payment: null,
  paymentStatus: { approved: false, published: false, exists: false },
  pix: { available: false, beneficiaryName: null, qrUrl: null },
  materials: [],
  contactChannels: [],
}
