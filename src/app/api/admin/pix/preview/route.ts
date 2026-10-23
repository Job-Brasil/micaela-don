import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unauthorized, notFound } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'

/**
 * Admin-only preview of the stored PIX QR image (before approval/publishing).
 * The public endpoint /api/public/pix-qr remains gated on approved+published.
 */
export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const pix = await db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!pix || !pix.qrImageData || !pix.qrImageMime) return notFound('Sem QR carregado.')
  const buf = Buffer.from(pix.qrImageData, 'base64')
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': pix.qrImageMime,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
