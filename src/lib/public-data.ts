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
 */
export async function getPublicSite(): Promise<PublicSite> {
  const [settings, payment, pix, materials, channels] = await Promise.all([
    db.siteSetting.findMany(),
    db.paymentConfig.findFirst({ orderBy: { updatedAt: 'desc' } }),
    db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } }),
    db.campaignMaterial.findMany({
      where: { approved: true, published: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.contactChannel.findMany({ where: { enabled: true, published: true } }),
  ])

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
}
