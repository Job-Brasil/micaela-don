import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const cfg = await db.paymentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  return json({ config: cfg })
}

const putSchema = z.object({
  currency: z.string().max(8).optional(),
  holder: z.string().trim().max(120).optional(),
  bank: z.string().trim().max(120).optional(),
  iban: z.string().trim().max(60).optional(),
  bic: z.string().trim().max(20).optional().nullable(),
  method: z.string().trim().max(80).optional(),
  published: z.boolean().optional(),
  approved: z.boolean().optional(),
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

  const existing = await db.paymentConfig.findFirst({ orderBy: { updatedAt: 'desc' } })
  const data = {
    currency: d.currency ?? existing?.currency ?? 'EUR',
    holder: d.holder ?? existing?.holder ?? '',
    bank: d.bank ?? existing?.bank ?? '',
    iban: d.iban ?? existing?.iban ?? '',
    bic: d.bic !== undefined ? d.bic : existing?.bic ?? null,
    method: d.method ?? existing?.method ?? 'Transferência bancária SEPA',
    published: d.published ?? existing?.published ?? false,
    approved: d.approved ?? existing?.approved ?? false,
    approvedById: d.approved ? email : existing?.approvedById ?? null,
    approvedAt: d.approved ? new Date() : existing?.approvedAt ?? null,
    notes: d.notes !== undefined ? d.notes : existing?.notes ?? null,
  }

  const cfg = await db.paymentConfig.upsert({
    where: { id: existing?.id ?? 'payment-eur' },
    update: data,
    create: { id: existing?.id ?? 'payment-eur', ...data },
  })

  await audit({
    actor: email,
    action: 'payment_config_updated',
    entity: 'PaymentConfig',
    entityId: cfg.id,
    detail: `published=${cfg.published} approved=${cfg.approved}`,
    ip: clientIp(req),
  })
  return json({ config: cfg })
}
