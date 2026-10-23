import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api'
import { clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const schema = z.object({
  campaignId: z.string().trim().max(60).default('micaela'),
  currency: z.enum(['EUR', 'BRL']),
  amount: z.number().nonnegative().optional(),
  donorName: z.string().trim().max(120).optional(),
  donorEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  donorWhatsapp: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional(),
  // Consent channels: which channels the donor wants to receive thank-yous on.
  consentChannels: z.array(z.enum(['email', 'whatsapp'])).default([]),
})

// Basic E.164-ish validation for WhatsApp numbers.
const validateWhatsapp = (v: string): boolean => {
  const cleaned = v.replace(/[\s\-()]/g, '')
  return /^\+\d{8,15}$/.test(cleaned)
}

/**
 * Creates a donation INTENT. Submitting this form is NOT proof of payment.
 * Confirmation is administrative or via a validated payment integration.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  }
  const d = parsed.data
  const ip = clientIp(req)

  // Validate: if email consent is requested, email must be provided.
  if (d.consentChannels.includes('email') && !d.donorEmail) {
    return badRequest('Para consentir em receber agradecimento por e-mail, precisa de indicar o seu endereço.')
  }
  // Validate: if whatsapp consent is requested, a valid number must be provided.
  if (d.consentChannels.includes('whatsapp') && (!d.donorWhatsapp || !validateWhatsapp(d.donorWhatsapp))) {
    return badRequest('Para consentir em receber agradecimento por WhatsApp, indique um número válido com indicativo internacional (ex: +351 912 345 678).')
  }

  // Resilient create: if campaign_id or donor_whatsapp columns don't exist yet
  // (pre-migration production), fall back to raw INSERT without them.
  const intent = await db.donationIntent.create({
    data: {
      campaignId: d.campaignId,
      currency: d.currency,
      amount: d.amount ?? null,
      donorName: d.donorName || null,
      donorEmail: d.donorEmail || null,
      donorWhatsapp: d.donorWhatsapp || null,
      message: d.message || null,
      status: 'received',
      ip,
    },
  }).catch(async (err) => {
    const code = (err as { code?: string })?.code
    // P2021 = table missing, P2022 = column missing → fall back to raw INSERT
    if (code === 'P2021' || code === 'P2022') {
      const msg = [d.message, d.donorWhatsapp ? `WhatsApp: ${d.donorWhatsapp}` : null]
        .filter(Boolean)
        .join(' · ') || null
      const rows = await db.$executeRawUnsafe(
        `INSERT INTO donation_intent (id, currency, amount, donor_name, donor_email, message, status, ip, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'received', $6, now(), now())
         RETURNING id`,
        d.currency,
        d.amount ?? null,
        d.donorName || null,
        d.donorEmail || null,
        msg,
        ip,
      )
      // $executeRawUnsafe returns count, not row; fetch the last inserted id
      const last = await db.$queryRawUnsafe(
        `SELECT id FROM donation_intent ORDER BY created_at DESC LIMIT 1`,
      ) as Array<{ id: string }>
      return { id: last[0]?.id ?? 'unknown', status: 'received' }
    }
    throw err
  })

  // Record consent per channel (resilient: skip if consent_record.campaign_id missing)
  for (const channel of d.consentChannels) {
    try {
      await db.consentRecord.create({
        data: {
          campaignId: d.campaignId,
          donorEmail: d.donorEmail || null,
          donorName: d.donorName || null,
          channel,
          consent: true,
          ip,
        },
      })
    } catch (err) {
      // Column missing — retry with raw INSERT (original schema columns only)
      const code = (err as { code?: string })?.code
      if (code === 'P2021' || code === 'P2022') {
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO consent_record (id, donor_email, donor_name, channel, consent, ip, created_at)
             VALUES (gen_random_uuid()::text, $1, $2, $3, true, $4, now())`,
            d.donorEmail || null,
            d.donorName || null,
            channel,
            ip,
          )
        } catch {
          // If still failing, skip consent recording (non-critical)
        }
      }
    }
  }

  await audit({
    actor: 'public',
    action: 'donation_intent_created',
    entity: 'DonationIntent',
    entityId: intent.id,
    detail: `currency=${d.currency} amount=${d.amount ?? 'n/a'} consent=${d.consentChannels.join(',') || 'none'}`,
    ip,
  })

  return json(
    {
      id: intent.id,
      status: intent.status,
      message:
        'Recebemos a sua intenção. A confirmação do donativo é administrativa. Este formulário não comprova pagamento.',
    },
    { status: 201 },
  )
}
