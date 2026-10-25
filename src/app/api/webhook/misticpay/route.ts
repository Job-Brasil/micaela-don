import { NextRequest, NextResponse } from 'next/server'

/**
 * Redirect from /api/webhook/misticpay (singular, as configured in MisticPay panel)
 * to /api/webhooks/misticpay (plural, where the actual handler lives).
 * This ensures the webhook URL configured in the MisticPay dashboard works.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const headers = new Headers(req.headers)
  // Forward to the plural route
  const res = await fetch(new URL('/api/webhooks/misticpay', req.url), {
    method: 'POST',
    headers,
    body,
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
