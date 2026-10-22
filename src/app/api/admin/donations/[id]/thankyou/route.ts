import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized, notFound } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const schema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  templateId: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

/**
 * Queue a thank-you message for a donation intent. Enforces the full consent +
 * duplicate-protection architecture even though the actual send is a future
 * integration (WhatsApp Business / email provider).
 *
 * Rules:
 *  - Blocked if no valid consent for the channel + recipient.
 *  - Blocked if an outbound message already exists for (channel, toAddress, donationIntentId)
 *    (unique constraint → duplicate protection).
 *  - The message is created with status='pending' and attempts=0. No automatic sending.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const donation = await db.donationIntent.findUnique({ where: { id } })
  if (!donation) return notFound('Donativo não encontrado.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const channel = parsed.data.channel

  const toAddress = channel === 'email' ? donation.donorEmail : null // whatsapp would need a phone; future
  if (!toAddress && channel === 'email') {
    return badRequest('Este donativo não tem e-mail associado para este canal.')
  }

  // 1) Consent gate.
  const consent = await db.consentRecord.findFirst({
    where: { channel, donorEmail: donation.donorEmail ?? undefined, consent: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!consent) {
    await audit({
      actor: email,
      action: 'thankyou_blocked_no_consent',
      entity: 'DonationIntent',
      entityId: donation.id,
      detail: `channel=${channel}`,
      ip: clientIp(req),
    })
    return badRequest('Bloqueado: não existe consentimento válido para este canal.')
  }

  // 2) Duplicate protection (unique constraint on channel+toAddress+donationIntentId).
  const existing = await db.outboundMessage.findUnique({
    where: {
      channel_toAddress_donationIntentId: {
        channel,
        toAddress: toAddress ?? '',
        donationIntentId: donation.id,
      },
    },
  })
  if (existing) {
    return badRequest('Já existe um agradecimento em fila para este donativo e canal.')
  }

  // 3) Queue (no send). Real dispatch happens in a future integration.
  const msg = await db.outboundMessage.create({
    data: {
      toAddress: toAddress ?? '',
      channel,
      templateId: parsed.data.templateId ?? null,
      status: 'pending',
      attempts: 0,
      donationIntentId: donation.id,
    },
  })

  await audit({
    actor: email,
    action: 'thankyou_queued',
    entity: 'OutboundMessage',
    entityId: msg.id,
    detail: `channel=${channel} donation=${donation.id}`,
    ip: clientIp(req),
  })

  return json(
    {
      ok: true,
      message: msg,
      note: 'Mensagem em fila. O envio real depende da integração oficial futura (WhatsApp Business / e-mail).',
    },
    { status: 201 },
  )
}
