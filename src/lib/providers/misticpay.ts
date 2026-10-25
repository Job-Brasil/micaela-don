/**
 * MisticPay adapter — server-only.
 *
 * Docs: https://docs.misticpay.com/
 * Base URL: https://api.misticpay.com/api
 * Auth: Authorization: Basic BASE64(pk_:sk_) or BASE64(client_id:client_secret)
 *
 * Create charge: POST /transactions/create
 *   Body: { amount, payerName, payerDocument, description, transactionId, projectWebhook }
 *   Returns: { transactionId, qrCode/pixQrCode, copyPaste/pixCopyPaste, status, ... }
 *
 * Check status: POST /transactions/check
 *   Body: { transactionId }
 *
 * Webhook: sent to projectWebhook URL when payment status changes.
 *
 * Credentials (MISTICPAY_CLIENT_ID, MISTICPAY_CLIENT_SECRET) are server-only env vars.
 * Supports both pk_/sk_ (new) and ci_/cs_ (legacy) formats.
 */

const MISTICPAY_BASE_URL = 'https://api.misticpay.com/api'

export type CreateMisticPayPaymentParams = {
  amount: number
  payerName: string
  payerDocument: string
  description: string
  transactionId: string
  webhookUrl: string
}

export type MisticPayPaymentResponse = {
  transactionId?: string
  pixQrCode?: string | null
  pixCopyPaste?: string | null
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
    throw new Error('MisticPay: credenciais não configuradas')
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  return `Basic ${basic}`
}

function isConfigured(): boolean {
  return !!(process.env.MISTICPAY_CLIENT_ID && process.env.MISTICPAY_CLIENT_SECRET)
}

/**
 * Safely extracts a string field from a response, trying multiple key names.
 */
function extractString(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = data[key]
    if (typeof val === 'string' && val.length > 0) return val
  }
  return null
}

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

  const data = await res.json() as Record<string, unknown>

  // Normalize: try multiple field names for QR and copy-paste
  const transactionId = extractString(data, ['transactionId', 'id', 'transaction_id', 'txid'])
  const pixQrCode = extractString(data, ['pixQrCode', 'qrCode', 'qr_code', 'pixQrcode', 'pix_qr_code', 'qrCodeBase64', 'qr_base64', 'emvqrcode', 'qrcode'])
  const pixCopyPaste = extractString(data, ['pixCopyPaste', 'copyPaste', 'copy_paste', 'pixCode', 'pix_code', 'brCode', 'brcode', 'payload', 'emv', 'copiaCola', 'copia_cola'])

  return {
    ...data,
    transactionId: transactionId ?? undefined,
    pixQrCode: pixQrCode ?? null,
    pixCopyPaste: pixCopyPaste ?? null,
    status: extractString(data, ['status', 'state', 'transactionState']),
    amount: typeof data.amount === 'number' ? data.amount : undefined,
  }
}

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
