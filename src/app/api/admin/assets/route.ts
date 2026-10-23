import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

const postSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mime: z.string().trim().max(80),
  data: z.string(), // data URL or raw base64
  published: z.boolean().default(true),
})

function parseDataUrl(input: string): { mime: string; data: string } | null {
  const m = input.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/)
  if (!m) return null
  return { mime: m[1]!, data: m[2]! }
}

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const assets = await db.siteAsset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, name: true, mime: true, width: true, height: true, published: true, createdAt: true },
  })
  return json({ assets })
}

export async function POST(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const parsedImg = parseDataUrl(parsed.data.data)
  let mime = parsed.data.mime
  let base64Data: string
  if (parsedImg) {
    mime = parsedImg.mime
    base64Data = parsedImg.data
  } else {
    base64Data = parsed.data.data
  }
  if (!ALLOWED_MIME.includes(mime)) {
    return badRequest('Formato não suportado. Use PNG, JPEG, WebP ou GIF.')
  }
  const buf = Buffer.from(base64Data, 'base64')
  if (buf.length > MAX_BYTES) return badRequest('Imagem demasiado grande (máx 2MB).')

  // Get dimensions
  let width: number | null = null
  let height: number | null = null
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(buf).metadata()
    width = meta.width ?? null
    height = meta.height ?? null
  } catch {
    // sharp not available; continue without dimensions
  }

  const asset = await db.siteAsset.create({
    data: {
      name: parsed.data.name,
      mime,
      data: base64Data,
      width,
      height,
      published: parsed.data.published,
    },
  })

  await audit({
    actor: email,
    action: 'asset_uploaded',
    entity: 'SiteAsset',
    entityId: asset.id,
    detail: `mime=${mime} bytes=${buf.length} published=${asset.published}`,
    ip: clientIp(req),
  })

  return json({
    id: asset.id,
    name: asset.name,
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
    published: asset.published,
    previewUrl: `/api/admin/assets/${asset.id}/preview`,
    publicUrl: asset.published ? `/api/public/asset/${asset.id}` : null,
  }, { status: 201 })
}
