import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notFound } from '@/lib/api'

/**
 * Serves a published site asset (image) by id. Returns 404 if the asset
 * doesn't exist OR is not published. This is the single public surface for
 * asset bytes; raw image data never lives in /public.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = await db.siteAsset.findUnique({ where: { id } })
  if (!asset || !asset.published || !asset.data) {
    return notFound('Imagem não disponível.')
  }
  const buf = Buffer.from(asset.data, 'base64')
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
