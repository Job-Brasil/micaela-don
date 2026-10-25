import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPayload } from '@/lib/payments/webhook'
import { audit } from '@/lib/audit'
import { fulfillPayment } from '@/lib/notifications/fulfillment'

/**
 * MisticPay webhook — receives payment status notifications.
 *
 * MisticPay sends POST to the projectWebhook URL (configured per transaction).
 * The payload includes transactionId and status.
 *
 * Security: MisticPay doesn't document HMAC signature verification in the
 * public docs. We use:
 * 1. MISTICPAY_WEBHOOK_SECRET — if configured, validate against a header or
 *    query parameter. If not documented, we accept the webhook but verify
 *    the transaction exists and matches our records.
 * 2. Idempotency via PaymentEvent.externalEventId.
 * 3. Order verification: externalId must match a PaymentOrder in our DB.
 *
 * Events processed:
 * - status "paid" / "confirmed" / "completed" → mark order as 'paid'
 * - status "expired" → mark order as 'expired'
 * - status "refunded" → mark order as 'refunded'
 */
export async function POST(req: NextRequest) {
  // 1) Get raw body
  const rawBody = await req.text()
  const payloadHash = hashPayload(rawBody)

  // 2) Parse the payload
  let payload: {
    transactionId?: string
    status?: string
    amount?: number
    event?: string
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  // 3) Optional: validate webhook secret (if MisticPay sends it)
  const webhookSecret = process.env.MISTICPAY_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = req.headers.get('x-webhook-signature') ??
                       req.headers.get('x-misticpay-signature') ??
                       req.headers.get('authorization')
    // If we have a secret configured, validate it
    if (webhookSecret && !signature) {
      return NextResponse.json({ error: 'Assinatura em falta.' }, { status: 400 })
    }
    // If signature present, verify (implementation depends on MisticPay's documented method)
    // For now, accept if the secret matches the signature directly (simple shared secret)
    if (signature && signature !== webhookSecret && signature !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
    }
  }

  // 4) Find the order by transactionId (our internalReference) or externalId
  const transactionId = payload.transactionId
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId em falta.' }, { status: 400 })
  }

  const order = await db.paymentOrder.findFirst({
    where: {
      OR: [
        { internalReference: transactionId },
        { externalId: transactionId },
      ],
    },
  })
  if (!order) {
    await audit({
      actor: 'misticpay_webhook',
      action: 'misticpay_event_no_order',
      entity: 'PaymentEvent',
      detail: `transactionId=${transactionId} status=${payload.status ?? 'unknown'}`,
    })
    return NextResponse.json({ received: true, no_order: true })
  }

  // 5) Idempotency
  const externalEventId = `misticpay_${transactionId}_${payload.status ?? payload.event ?? 'unknown'}`
  const existing = await db.paymentEvent.findUnique({
    where: { externalEventId },
  })
  if (existing && existing.status === 'processed') {
    return NextResponse.json({ received: true, duplicate: true })
  }

  let paymentEvent
  if (existing) {
    paymentEvent = existing
  } else {
    try {
      paymentEvent = await db.paymentEvent.create({
        data: {
          provider: 'misticpay',
          eventType: payload.event ?? payload.status ?? 'unknown',
          externalEventId,
          payloadHash,
          status: 'pending',
        },
      })
    } catch {
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  // 6) Process the event
  const status = (payload.status ?? payload.event ?? '').toLowerCase()
  try {
    if (['paid', 'confirmed', 'completed', 'approved'].includes(status)) {
      if (order.status !== 'paid') {
        await db.paymentOrder.update({
          where: { id: order.id },
          data: { status: 'paid', confirmedAt: new Date() },
        })
        await audit({
          actor: 'misticpay_webhook',
          action: 'payment_confirmed',
          entity: 'PaymentOrder',
          entityId: order.id,
          detail: `provider=misticpay amount=${order.amount}`,
        })
        // Trigger email + delivery (idempotent)
        await fulfillPayment(order.id)
      }
    } else if (['expired', 'timeout'].includes(status)) {
      await db.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'expired' },
      })
    } else if (['refunded', 'reversed'].includes(status)) {
      await db.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'refunded', refundedAt: new Date() },
      })
    } else if (['failed', 'rejected', 'cancelled'].includes(status)) {
      await db.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'failed' },
      })
    }

    await db.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: { status: 'processed', processedAt: new Date(), orderId: order.id },
    })

    return NextResponse.json({ received: true, processed: true })
  } catch (e) {
    await db.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: { status: 'failed', orderId: order.id },
    })
    console.error('[misticpay webhook] process error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erro ao processar.' }, { status: 500 })
  }
}
