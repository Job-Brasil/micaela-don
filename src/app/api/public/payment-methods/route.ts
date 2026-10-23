import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api'

/**
 * Returns which payment methods are available for a given campaign.
 * This is determined by:
 * - Stripe: STRIPE_SECRET_KEY env is set → mbway available
 * - PixGo: PIXGO_API_KEY env is set → pix_automatic available (but always disabled for users until approval)
 * - PIX manual: pix_config exists with approved+published → pix_manual available
 * - Bank transfer: payment_config exists with approved+published → bank_transfer available
 *
 * No secrets are exposed — only boolean availability flags.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId') ?? 'micaela'

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY

  let pixManualAvailable = false
  let bankTransferAvailable = false
  let pixBeneficiaryName: string | null = null
  let bankHolder: string | null = null
  let bankIban: string | null = null
  let bankName: string | null = null
  let bankBic: string | null = null

  try {
    const pix = await db.pixConfig.findFirst({
      where: { campaignId },
      orderBy: { updatedAt: 'desc' },
    }).catch(() =>
      db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } }).catch(() => null),
    ) as { approved?: boolean; published?: boolean; beneficiaryName?: string } | null

    if (pix && pix.approved && pix.published) {
      pixManualAvailable = true
      pixBeneficiaryName = pix.beneficiaryName ?? null
    }
  } catch {
    // non-critical
  }

  try {
    const payment = await db.paymentConfig.findFirst({
      where: { campaignId },
      orderBy: { updatedAt: 'desc' },
    }).catch(() =>
      db.paymentConfig.findFirst({ orderBy: { updatedAt: 'desc' } }).catch(() => null),
    ) as { approved?: boolean; published?: boolean; holder?: string; iban?: string; bank?: string; bic?: string | null } | null

    if (payment && payment.approved && payment.published) {
      bankTransferAvailable = true
      bankHolder = payment.holder ?? null
      bankIban = payment.iban ?? null
      bankName = payment.bank ?? null
      bankBic = payment.bic ?? null
    }
  } catch {
    // non-critical
  }

  return json({
    methods: {
      mbway: {
        available: stripeConfigured,
        currency: 'EUR',
        reason: stripeConfigured ? null : 'Stripe não configurado',
      },
      pix_automatic: {
        available: false,
        currency: 'BRL',
        reason: 'PIX automático em validação técnica e comercial',
      },
      pix_manual: {
        available: pixManualAvailable,
        currency: 'BRL',
        beneficiaryName: pixBeneficiaryName,
      },
      bank_transfer: {
        available: bankTransferAvailable,
        currency: 'EUR',
        holder: bankHolder,
        bank: bankName,
        iban: bankIban,
        bic: bankBic,
      },
    },
    suggestedAmounts: {
      EUR: [5, 10, 20, 50],
      BRL: [20, 50, 100, 200],
    },
    limits: {
      EUR: { minMinor: 100, maxMinor: 1000000 },
      BRL: { minMinor: 100, maxMinor: 5000000 },
    },
  })
}
