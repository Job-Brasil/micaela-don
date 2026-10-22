import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const pix = await db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  // Do not return the heavy base64 in the JSON payload; return metadata + presence flag.
  return json({
    config: pix
      ? {
          id: pix.id,
          qrPresent: !!pix.qrImageData,
          qrImageMime: pix.qrImageMime ?? null,
          beneficiaryName: pix.beneficiaryName ?? null,
          approved: pix.approved,
          published: pix.published,
          notes: pix.notes ?? null,
          updatedAt: pix.updatedAt,
        }
      : null,
  })
}

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

const postSchema = z.object({
  qrImage: z.string(), // data URL or raw base64
  beneficiaryName: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})

function parseDataUrl(input: string): { mime: string; data: string } | null {
  const m = input.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/)
  if (!m) return null
  return { mime: m[1]!, data: m[2]! }
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

  const parsedImg = parseDataUrl(parsed.data.qrImage)
  if (!parsedImg) return badRequest('Imagem inválida (esperado data URL base64).')
  if (!ALLOWED_MIME.includes(parsedImg.mime)) {
    return badRequest('Formato não suportado. Use PNG, JPEG ou WebP.')
  }
  const buf = Buffer.from(parsedImg.data, 'base64')
  if (buf.length > MAX_BYTES) return badRequest('Imagem demasiado grande (máx 1.5MB).')

  const existing = await db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  // A new upload always resets approval/publication: the admin must re-verify the new QR.
  const cfg = await db.pixConfig.upsert({
    where: { id: existing?.id ?? 'pix-brl' },
    update: {
      qrImageData: buf.toString('base64'),
      qrImageMime: parsedImg.mime,
      beneficiaryName: parsed.data.beneficiaryName ?? existing?.beneficiaryName ?? null,
      approved: false,
      published: false,
      approvedById: null,
      approvedAt: null,
      notes: parsed.data.notes ?? existing?.notes ?? null,
    },
    create: {
      id: existing?.id ?? 'pix-brl',
      qrImageData: buf.toString('base64'),
      qrImageMime: parsedImg.mime,
      beneficiaryName: parsed.data.beneficiaryName ?? null,
      approved: false,
      published: false,
      notes: parsed.data.notes ?? null,
    },
  })

  await audit({
    actor: email,
    action: 'pix_qr_uploaded',
    entity: 'PixConfig',
    entityId: cfg.id,
    detail: `mime=${parsedImg.mime} bytes=${buf.length}`,
    ip: clientIp(req),
  })
  return json({ ok: true, config: { qrPresent: true, approved: false, published: false } })
}

const putSchema = z.object({
  beneficiaryName: z.string().trim().max(120).optional().nullable(),
  approved: z.boolean().optional(),
  published: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export async function PUT(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  const d = parsed.data

  const existing = await db.pixConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!existing) return badRequest('Nenhuma configuração PIX. Carregue um QR primeiro.')

  // Guardrail: cannot publish without approval, and cannot approve without an image.
  const approved = d.approved ?? existing.approved
  const published = d.published ?? existing.published
  if (published && !approved) return badRequest('Não pode publicar o PIX sem aprovação.')
  if ((approved || published) && !existing.qrImageData)
    return badRequest('Não pode aprovar/publicar sem um QR carregado.')

  const cfg = await db.pixConfig.update({
    where: { id: existing.id },
    data: {
      beneficiaryName: d.beneficiaryName ?? existing.beneficiaryName,
      approved,
      published,
      approvedById: approved ? email : null,
      approvedAt: approved ? new Date() : null,
      notes: d.notes ?? existing.notes,
    },
  })

  await audit({
    actor: email,
    action: 'pix_config_updated',
    entity: 'PixConfig',
    entityId: cfg.id,
    detail: `approved=${cfg.approved} published=${cfg.published}`,
    ip: clientIp(req),
  })
  return json({
    ok: true,
    config: {
      qrPresent: !!cfg.qrImageData,
      beneficiaryName: cfg.beneficiaryName,
      approved: cfg.approved,
      published: cfg.published,
      notes: cfg.notes,
    },
  })
}
