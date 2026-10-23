import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { json, unauthorized, notFound, badRequest } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

/** Admin-only preview of an asset (regardless of published state). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const asset = await db.siteAsset.findUnique({ where: { id } })
  if (!asset || !asset.data) return notFound('Imagem não encontrada.')
  const buf = Buffer.from(asset.data, 'base64')
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/** Toggle published state. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const asset = await db.siteAsset.findUnique({ where: { id } })
  if (!asset) return notFound('Imagem não encontrada.')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const published = typeof body === 'object' && body !== null && 'published' in body
    ? Boolean((body as { published: unknown }).published)
    : asset.published
  const updated = await db.siteAsset.update({ where: { id }, data: { published } })
  await audit({
    actor: email,
    action: 'asset_updated',
    entity: 'SiteAsset',
    entityId: id,
    detail: `published=${updated.published}`,
    ip: clientIp(req),
  })
  return json({ id: updated.id, published: updated.published })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const { id } = await params
  const asset = await db.siteAsset.findUnique({ where: { id } })
  if (!asset) return notFound('Imagem não encontrada.')
  await db.siteAsset.delete({ where: { id } })
  await audit({
    actor: email,
    action: 'asset_deleted',
    entity: 'SiteAsset',
    entityId: id,
    ip: clientIp(req),
  })
  return json({ ok: true })
}
