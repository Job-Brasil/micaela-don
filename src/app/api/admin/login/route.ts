import { NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyAdminPassword, createSessionCookie, ADMIN_COOKIE, clientIp } from '@/lib/auth'
import { json, badRequest, unauthorized } from '@/lib/api'
import { audit } from '@/lib/audit'

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('JSON inválido.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return badRequest('Credenciais inválidas.')
  }
  const { email, password } = parsed.data

  const ok = await verifyAdminPassword(password)
  if (!ok || email.toLowerCase() !== (process.env.ADMIN_EMAIL ?? '').toLowerCase()) {
    await audit({
      actor: email,
      action: 'admin_login_failed',
      entity: 'AdminUser',
      ip: clientIp(req),
    })
    return unauthorized('Credenciais inválidas.')
  }

  const cookie = await createSessionCookie()
  await audit({
    actor: email,
    action: 'admin_login_success',
    entity: 'AdminUser',
    ip: clientIp(req),
  })

  const res = json({ ok: true })
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookie.maxAge,
  })
  return res
}
