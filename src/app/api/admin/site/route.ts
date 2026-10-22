import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { json, badRequest, unauthorized } from '@/lib/api'
import { requireAdmin, clientIp } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const settings = await db.siteSetting.findMany()
  const map = settings.reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.value
    return acc
  }, {})
  return json({ settings: map })
}

const updateSchema = z.object({
  settings: z.record(z.string(), z.string()),
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
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest('Dados inválidos.')

  const keys = Object.keys(parsed.data.settings)
  await Promise.all(
    keys.map((k) =>
      db.siteSetting.upsert({
        where: { key: k },
        update: { value: parsed.data.settings[k] },
        create: { key: k, value: parsed.data.settings[k] },
      }),
    ),
  )
  await audit({
    actor: email,
    action: 'site_settings_updated',
    entity: 'SiteSetting',
    detail: `keys=${keys.join(',')}`,
    ip: clientIp(req),
  })
  return json({ ok: true })
}
