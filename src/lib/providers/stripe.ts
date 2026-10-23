import Stripe from 'stripe'

/**
 * Stripe adapter — server-only. Uses STRIPE_SECRET_KEY from env.
 *
 * This integration uses Stripe Checkout (hosted by Stripe) for MB WAY in Portugal.
 * The Stripe Secret Key is NEVER exposed to the client.
 *
 * Configuration:
 * - STRIPE_SECRET_KEY: sk_test_... (test) or sk_live_... (production)
 * - STRIPE_WEBHOOK_SECRET: whsec_... (from Stripe Dashboard webhook endpoint)
 *
 * MB WAY: payment_method_types=['multibanco'] is NOT mbway.
 * MB WAY uses the 'multibanco' payment method type ONLY for Multibanco reference payments.
 * For MB WAY, Stripe Checkout handles the method selection automatically when the
 * customer is in Portugal; no explicit payment_method_types is needed for MB WAY.
 * We set payment_method_types to undefined (let Stripe show available methods).
 *
 * IMPORTANT: confirm MB WAY is enabled in the Stripe Dashboard for the account,
 * country (PT), and currency (EUR) before going live.
 */

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY não configurada no servidor.')
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion,
      typescript: true,
    })
  }
  return stripeInstance
}

export type CreateSessionParams = {
  internalReference: string
  amount: number // in major currency units (e.g. euros), will be converted to cents
  currency: string // e.g. 'eur'
  campaignName: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

/**
 * Creates a Stripe Checkout Session for MB WAY.
 *
 * MB WAY availability:
 * - Stripe Checkout automatically displays MB WAY to PT customers when enabled.
 * - No explicit payment_method_types needed (Stripe shows available methods by country).
 * - If you want to restrict to MB WAY only, set payment_method_types: ['multibanco']
 *   BUT NOTE: 'multibanco' is Multibanco reference, NOT MB WAY. MB WAY does not
 *   have a dedicated payment_method_types value in Stripe Checkout; it appears
 *   automatically for PT customers.
 *
 * We use `payment_method_types` unset (let Stripe choose) + `payment_method_options`
 * if needed. This is the officially supported approach.
 */
export async function createCheckoutSession(params: CreateSessionParams): Promise<{
  sessionId: string
  sessionUrl: string
}> {
  const stripe = getStripe()
  const amountInSmallestUnit = Math.round(params.amount * 100) // euros → cents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: amountInSmallestUnit,
          product_data: {
            name: `Apoio — ${params.campaignName}`,
            description: 'Contribuição para campanha de solidariedade',
          },
        },
      },
    ],
    // Let Stripe show available payment methods (MB WAY appears for PT customers).
    // Do NOT set payment_method_types to ['multibanco'] — that's Multibanco, not MB WAY.
    customer_email: params.customerEmail,
    client_reference_id: params.internalReference,
    metadata: {
      internal_reference: params.internalReference,
      campaign_name: params.campaignName,
      ...params.metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'pt',
  })

  if (!session.url) {
    throw new Error('Stripe não devolveu URL de checkout.')
  }

  return {
    sessionId: session.id,
    sessionUrl: session.url,
  }
}

/**
 * Verifies a Stripe webhook signature using the official SDK.
 * Uses the raw body (as string) and the STRIPE_WEBHOOK_SECRET.
 *
 * @returns The verified Stripe event, or throws if invalid.
 */
export function verifyStripeWebhook(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET não configurada no servidor.')
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}

export type StripeSession = Stripe.Checkout.Session
export type StripeEvent = Stripe.Event
