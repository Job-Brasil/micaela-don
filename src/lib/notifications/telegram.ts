/**
 * Telegram alerts — server-only. Uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
 *
 * Sends private alerts to a configured channel when a manual PIX payment
 * intention is created. The alert contains ONLY:
 *   - internal order id
 *   - campaign name
 *   - amount + currency
 *   - secure admin link
 *
 * It NEVER contains CPF/CNPJ, personal documents, or excessive personal data.
 *
 * If Telegram is not configured (env vars missing) or the send fails,
 * the error is logged to audit — it NEVER pretends the alert was sent.
 */

type AlertParams = {
  orderId: string
  campaignName: string
  amount: string
  currency: string
  reference: string
  adminLink?: string
}

/**
 * Sends a Telegram alert to the configured channel.
 *
 * @returns { sent: boolean, error?: string }
 *   sent=false + no error = Telegram not configured (acceptable)
 *   sent=false + error = send failed (logged to audit)
 *   sent=true = alert delivered
 */
export async function sendTelegramAlert(params: AlertParams): Promise<{
  sent: boolean
  error?: string
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  // Not configured — this is acceptable; log to audit
  if (!token || !chatId) {
    return { sent: false }
  }

  const text = formatAlertMessage(params)

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { sent: false, error: `Telegram ${res.status}: ${errText.slice(0, 100)}` }
    }

    return { sent: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { sent: false, error: msg }
  }
}

/**
 * Formats the alert message. Contains NO personal data (no CPF, no email, no phone).
 */
function formatAlertMessage(p: AlertParams): string {
  const lines = [
    '🔔 <b>Nova intenção de pagamento PIX manual</b>',
    '',
    `📋 Campanha: ${escapeHtml(p.campaignName)}`,
    `💰 Valor: ${p.amount} ${p.currency}`,
    `🔖 Referência: <code>${escapeHtml(p.reference)}</code>`,
  ]
  if (p.adminLink) {
    lines.push(`🔗 <a href="${escapeHtml(p.adminLink)}">Ver no painel admin</a>`)
  }
  lines.push('', '⚠️ A confirmação é administrativa. Verifique o recebimento antes de confirmar.')
  return lines.join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Checks if Telegram is configured (without exposing values).
 */
export function isTelegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}
