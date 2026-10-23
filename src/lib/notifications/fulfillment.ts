import { db } from '@/lib/db'
import { sendThankYouEmail, buildThankYouHtml } from '@/lib/notifications/email'
import { createDeliveryLink } from '@/lib/notifications/delivery'
import { audit } from '@/lib/audit'

/**
 * Fulfillment — triggered after a payment is confirmed as 'paid'.
 *
 * This is the SINGLE entry point for post-payment actions:
 * 1. Send thank-you email (idempotent — won't send twice for the same order).
 * 2. If the campaign has digital content configured, create a delivery link
 *    and include it in the email.
 *
 * Called by the Stripe and PixGo webhook handlers when payment_status → 'paid'.
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

  // Get campaign for name + digital content config (future: campaign.deliveryConfig)
  const campaign = await db.campaign.findUnique({
    where: { id: order.campaignId },
  })
  const campaignName = campaign?.name ?? 'Campanha de solidariedade'

  // Build email content
  let html = buildThankYouHtml(campaignName, order.amount.toString(), order.currency, order.internalReference)
  let deliveryLinkToken: string | undefined

  // TODO (future): check campaign.deliveryConfig for digital content assetRef
  // For now, no digital content is configured per campaign — only email is sent.
  // When a campaign has digital content, create a delivery link here:
  //
  // if (campaign.deliveryAssetRef) {
  //   const { token } = await createDeliveryLink(order.id, campaign.deliveryAssetRef)
  //   deliveryLinkToken = token
  //   html += `<p><a href="https://ajudar.charity/api/delivery/${token}">Aceder ao conteúdo</a></p>`
  // }

  const emailResult = await sendThankYouEmail({
    to: order.customerEmail,
    subject: `Obrigado pelo seu apoio — ${campaignName}`,
    html,
    campaignId: order.campaignId,
    orderId: order.id,
  })

  return {
    emailSent: emailResult.sent,
    deliveryLink: deliveryLinkToken
      ? `/api/delivery/${deliveryLinkToken}`
      : undefined,
    error: emailResult.error,
  }
}
