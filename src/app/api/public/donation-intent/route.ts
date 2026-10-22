import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api'
import { clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const schema = z.object({
  currency: z.enum(['EUR', 'BRL']),
  amount: z.number().nonnegative().optional(),
  donorName: z.string().trim().max(120).optional(),
  donorEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional(),
  consentEmail: z.boolean().optional(),
})

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

  const intent = await db.donationIntent.create({
    data: {
      currency: d.currency,
      amount: d.amount ?? null,
      donorName: d.donorName || null,
      donorEmail: d.donorEmail || null,
      message: d.message || null,
      status: 'received',
      ip,
    },
  })

  if (d.consentEmail && d.donorEmail) {
    await db.consentRecord.create({
      data: {
        donorEmail: d.donorEmail,
        donorName: d.donorName || null,
        channel: 'email',
        consent: true,
        ip,
      },
    })
  }

  await audit({
    actor: 'public',
    action: 'donation_intent_created',
    entity: 'DonationIntent',
    entityId: intent.id,
    detail: `currency=${d.currency} amount=${d.amount ?? 'n/a'}`,
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
