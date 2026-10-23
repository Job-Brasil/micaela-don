import { NextRequest, NextResponse } from 'next/server'
import { consumeDeliveryLink } from '@/lib/notifications/delivery'
import { db } from '@/lib/db'

/**
 * Serves digital content via a one-time, expiring delivery link.
 *
 * Validates:
 * - token exists
 * - not expired
 * - not consumed (one-time use)
 * - associated order is 'paid'
 *
 * The assetRef can be:
 * - 'asset:<id>' → serve from SiteAsset (if published)
 * - 'storage:<path>' → serve from Supabase Storage private bucket (future)
 * - URL → redirect (for external content)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const result = await consumeDeliveryLink(token)
  if (!result) {
    return NextResponse.json(
      { error: 'Link de entrega inválido, expirado ou já utilizado.' },
      { status: 404 },
    )
  }

  const { assetRef, orderId } = result

  // Resolve assetRef
  if (assetRef.startsWith('asset:')) {
    const assetId = assetRef.slice(6)
    const asset = await db.siteAsset.findUnique({ where: { id: assetId } })
    if (!asset || !asset.data) {
      return NextResponse.json({ error: 'Conteúdo não disponível.' }, { status: 404 })
    }
    const buf = Buffer.from(asset.data, 'base64')
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': asset.mime,
        'Content-Disposition': `attachment; filename="${asset.name}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  if (assetRef.startsWith('storage:')) {
    // Future: Supabase Storage private bucket
    return NextResponse.json(
      { error: 'Entrega via storage ainda não implementada.' },
      { status: 501 },
    )
  }

  // External URL → redirect
  if (assetRef.startsWith('http://') || assetRef.startsWith('https://')) {
    return NextResponse.redirect(assetRef, { status: 302 })
  }

  return NextResponse.json({ error: 'Tipo de conteúdo não suportado.' }, { status: 400 })
}
