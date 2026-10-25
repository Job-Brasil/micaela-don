/**
 * MisticPay adapter — server-only.
 *
 * Docs: https://docs.misticpay.com/
 * Base URL: https://api.misticpay.com/api
 * Auth: Authorization: Basic BASE64(client_id:client_secret)
 *
 * Create charge: POST /transactions/create
 *   Body: { amount, payerName, payerDocument, description, transactionId, projectWebhook }
 *   Returns: { transactionId, pixQrCode, pixCopyPaste, status, ... }
 *
 * Check status: POST /transactions/check
 *   Body: { transactionId }
 *
 * Webhook: sent to projectWebhook URL when payment status changes.
 *   Events: payment.confirmed, payment.expired, etc.
 *
 * Credentials (MISTICPAY_CLIENT_ID, MISTICPAY_CLIENT_SECRET) are server-only env vars.
 */

const MISTICPAY_BASE_URL = 'https://api.misticpay.com/api'

export type CreateMisticPayPaymentParams = {
  amount: number // in BRL (major units, e.g. 50.00)
  payerName: string
  payerDocument: string // CPF (11 digits) or CNPJ (14 digits), no formatting
  description: string
  transactionId: string // our internal reference
  webhookUrl: string
}

export type MisticPayPaymentResponse = {
  transactionId?: string
  pixQrCode?: string // base64 QR image
  pixCopyPaste?: string // PIX Copia e Cola code
  status?: string
  amount?: number
  [key: string]: unknown
}

export type MisticPayStatusResponse = {
  transactionId?: string
  status?: string
  amount?: number
  [key: string]: unknown
}

function getAuthHeader(): string {
  const clientId = process.env.MISTICPAY_CLIENT_ID
  const clientSecret = process.env.MISTICPAY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('MisticPay: credenciais não configuradas (MISTICPAY_CLIENT_ID / MISTICPAY_CLIENT_SECRET)')
  }
  // Basic Auth: Base64(client_id:client_secret)
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  return `Basic ${basic}`
}

function isConfigured(): boolean {
  return !!(process.env.MISTICPAY_CLIENT_ID && process.env.MISTICPAY_CLIENT_SECRET)
}

/**
 * Creates a PIX payment via MisticPay API.
 * POST /transactions/create
 */
export async function createMisticPayPayment(
  params: CreateMisticPayPaymentParams,
): Promise<MisticPayPaymentResponse> {
  const auth = getAuthHeader()
  const body = {
    amount: params.amount,
    payerName: params.payerName,
    payerDocument: params.payerDocument,
    description: params.description,
    transactionId: params.transactionId,
    projectWebhook: params.webhookUrl,
  }

  const res = await fetch(`${MISTICPAY_BASE_URL}/transactions/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const code = errorData?.code ?? 'UNKNOWN'
    const message = errorData?.message ?? `MisticPay API error ${res.status}`
    throw new Error(`MisticPay ${code}: ${message}`)
  }

  const data = await res.json() as MisticPayPaymentResponse
  // Normalize field names: MisticPay may return different keys for QR/pix code
  const normalized: MisticPayPaymentResponse = {
    ...data,
    transactionId: data.transactionId ?? (data as Record<string, unknown>).transactionId as string ?? (data as Record<string, unknown>).id as string,
    pixQrCode: data.pixQrCode
      ?? (data as Record<string, unknown>).qrCode as string
      ?? (data as Record<string, unknown>).qr_code as string
      ?? (data as Record<string, unknown>).pixQrcode as string
      ?? (data as Record<string, unknown>).pix_qr_code as string
      ?? (data as Record<string, unknown>).qrCodeBase64 as string
      ?? null,
    pixCopyPaste: data.pixCopyPaste
      ?? (data as Record<string, unknown>).copyPaste as string
      ?? (data as Record<string, unknown>).copy_paste as string
      ?? (data as Record<string, unknown>).pixCode as string
      ?? (data as Record<string, unknown>).pix_code as string
      ?? (data as Record<string, unknown>).brCode as string
      ?? (data as Record<string, unknown>).brcode as string
      ?? (data as Record<string, unknown>).payload as string
      ?? null,
  }
  return normalized
}

/**
 * Queries the status of a MisticPay transaction.
 * POST /transactions/check
 */
export async function getMisticPayPaymentStatus(
  transactionId: string,
): Promise<MisticPayStatusResponse> {
  const auth = getAuthHeader()
  const res = await fetch(`${MISTICPAY_BASE_URL}/transactions/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth,
    },
    body: JSON.stringify({ transactionId }),
  })
  if (!res.ok) {
    throw new Error(`MisticPay API error ${res.status}`)
  }
  return (await res.json()) as MisticPayStatusResponse
}

export { isConfigured as isMisticPayConfigured }
