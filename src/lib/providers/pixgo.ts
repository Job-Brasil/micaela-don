/**
 * PixGo adapter — server-only. Uses PIXGO_API_KEY from env.
 *
 * Documentation: https://pixgo.org/api/v1/docs
 * Base URL: https://pixgo.org/api/v1
 * Auth: header X-API-Key
 *
 * Webhook signature: HMAC-SHA256 over '{timestamp}.{rawBody}' using
 * PIXGO_WEBHOOK_SECRET. Validated in src/lib/payments/webhook.ts.
 *
 * IMPORTANT NOTES from PixGo docs:
 * - receiver_cpf is required when creating a payment.
 * - The QR may be linked to the CPF/CNPJ provided.
 * - No separate sandbox environment.
 * - Settlement is in DePix to a Liquid wallet (not direct BRL to bank account).
 * - There are account limits and validations.
 *
 * The CPF/CNPJ is collected from the customer, sent to PixGo to create the charge,
 * and then DISCARDED — never persisted in our database, logs, or alerts.
 */

const PIXGO_BASE_URL = 'https://pixgo.org/api/v1'

export type CreatePixGoPaymentParams = {
  amount: number // in BRL (major units)
  description: string
  receiverCpf: string // CPF/CNPJ of the payer (required by PixGo)
  receiverEmail: string
  externalId: string // our internalReference
  webhookUrl: string
}

export type PixGoPaymentResponse = {
  payment_id: string
  qr_code?: string // PIX Copia e Cola
  qr_code_image?: string // base64 QR image
  status?: string
  expires_at?: string
  amount?: number
  [key: string]: unknown
}

export type PixGoPaymentStatus = {
  payment_id: string
  status: string
  amount?: number
  [key: string]: unknown
}

function getApiKey(): string {
  const key = process.env.PIXGO_API_KEY
  if (!key) {
    throw new Error('PIXGO_API_KEY não configurada no servidor.')
  }
  return key
}

/**
 * Creates a PIX payment via PixGo API.
 * POST /payment/create with X-API-Key header.
 *
 * The receiverCpf is sent to PixGo but NEVER persisted by us.
 */
export async function createPixGoPayment(
  params: CreatePixGoPaymentParams,
): Promise<PixGoPaymentResponse> {
  const apiKey = getApiKey()
  const body = {
    amount: params.amount,
    description: params.description,
    receiver_cpf: params.receiverCpf,
    receiver_email: params.receiverEmail,
    external_id: params.externalId,
    webhook_url: params.webhookUrl,
  }

  const res = await fetch(`${PIXGO_BASE_URL}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    // Sanitize error — never include the CPF or API key
    throw new Error(`PixGo API error ${res.status}`)
  }

  const data = (await res.json()) as PixGoPaymentResponse
  return data
}

/**
 * Queries the status of a PixGo payment.
 * GET /payment/{id} with X-API-Key header.
 */
export async function getPixGoPaymentStatus(
  paymentId: string,
): Promise<PixGoPaymentStatus> {
  const apiKey = getApiKey()
  const res = await fetch(`${PIXGO_BASE_URL}/payment/${paymentId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
  })
  if (!res.ok) {
    throw new Error(`PixGo API error ${res.status}`)
  }
  return (await res.json()) as PixGoPaymentStatus
}
