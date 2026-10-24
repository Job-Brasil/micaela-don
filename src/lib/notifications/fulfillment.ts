import { db } from '@/lib/db'
import { sendThankYouEmail, buildThankYouHtml } from '@/lib/notifications/email'
import { createDeliveryLink } from '@/lib/notifications/delivery'
import { audit } from '@/lib/audit'

/**
 * Fulfillment — triggered after a payment is confirmed as 'paid'.
 *
 * This is the SINGLE entry point for post-payment actions:
 * 1. Send thank-you email (idempotent — won't send twice for the same order).
 * 2. If the donor selected wantPackMedia AND the campaign has deliveryAssetRef
 *    configured, create a delivery link and include it in the email.
 *
 * Called by the Stripe and PixGo webhook handlers when payment_status → 'paid'.
 * Also called by the manual payment confirmation route.
 *
 * Idempotency: the email layer checks if an email was already sent for the
 * (orderId, channel=email) pair and skips if so. This means webhook retries
 * do NOT trigger duplicate emails.
 */

export type FulfillmentResult = {
  emailSent: boolean
  deliveryLink?: string
  error?: string
}

export async function fulfillPayment(orderId: string): Promise<FulfillmentResult> {
  const order = await db.paymentOrder.findUnique({
    where: { id: orderId },
  })
  if (!order) {
    return { emailSent: false, error: 'Order not found' }
  }
  if (order.status !== 'paid') {
    return { emailSent: false, error: 'Order not paid' }
  }
  if (!order.customerEmail) {
    await audit({
      actor: 'system',
      action: 'fulfillment_no_email',
      entity: 'PaymentOrder',
      entityId: orderId,
      detail: 'No customer email on order',
    })
    return { emailSent: false, error: 'No customer email' }
  }

  // Get campaign for name + digital content config
  const campaign = await db.campaign.findUnique({
    where: { id: order.campaignId },
  })
  const campaignName = campaign?.name ?? 'Campanha de solidariedade'

  // Build email content
  let html = buildThankYouHtml(campaignName, order.amount.toString(), order.currency, order.internalReference)
  let deliveryLinkToken: string | undefined

  // Check if the donor wants the Pack Media AND the campaign has content configured.
  // The donationIntent linked to this order may have wantPackMedia=true.
  let wantPackMedia = false
  if (order.donationIntentId) {
    const intent = await db.donationIntent.findUnique({
      where: { id: order.donationIntentId },
      select: { wantPackMedia: true },
    }).catch(() => null)
    wantPackMedia = intent?.wantPackMedia ?? false
  }

  if (wantPackMedia && campaign?.deliveryAssetRef) {
    // Create a one-time, expiring delivery link for the Pack Media content.
    try {
      const { token } = await createDeliveryLink(order.id, campaign.deliveryAssetRef)
      deliveryLinkToken = token
      const deliveryUrl = `https://www.ajudar.charity/api/delivery/${token}`
      html += `<div style="margin-top:24px;padding:16px;border:1px solid #e7e5e4;border-radius:8px;background:#fafaf9;">
        <p style="margin:0;font-weight:600;color:#1c1917;">Pack Media de agradecimento</p>
        <p style="margin:8px 0 12px;color:#78716c;font-size:14px;">Obrigado por ter escolhido receber os materiais digitais. Pode aceder ao conteúdo através do link abaixo. O link é pessoal e expira em 72 horas.</p>
        <a href="${deliveryUrl}" style="display:inline-block;padding:10px 20px;background:#e11d48;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Aceder ao Pack Media</a>
      </div>`
      await audit({
        actor: 'system',
        action: 'pack_media_delivery_link_created',
        entity: 'PaymentOrder',
        entityId: orderId,
        detail: `campaign=${campaign.id} asset=${campaign.deliveryAssetRef.slice(0, 30)}`,
      })
    } catch (e) {
      // Log delivery failure but don't block the email
      await audit({
        actor: 'system',
        action: 'pack_media_delivery_failed',
        entity: 'PaymentOrder',
        entityId: orderId,
        detail: `error=${e instanceof Error ? e.message.slice(0, 100) : 'unknown'}`,
      })
    }
  } else if (wantPackMedia && !campaign?.deliveryAssetRef) {
    // Donor wanted Pack Media but campaign has no content configured.
    // Don't promise delivery; inform in audit.
    await audit({
      actor: 'system',
      action: 'pack_media_no_content_configured',
      entity: 'PaymentOrder',
      entityId: orderId,
      detail: `campaign=${campaign?.id} — donor wanted Pack Media but no deliveryAssetRef configured`,
    })
  }

  const emailResult = await sendThankYouEmail({
    to: order.customerEmail,
    subject: `Obrigado pelo seu apoio — ${campaignName}`,
    html,
    campaignId: order.campaignId,
    orderId: order.id,
    donationIntentId: order.donationIntentId ?? undefined,
  })

  return {
    emailSent: emailResult.sent,
    deliveryLink: deliveryLinkToken
      ? `/api/delivery/${deliveryLinkToken}`
      : undefined,
    error: emailResult.error,
  }
}
