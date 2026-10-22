import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { json, unauthorized } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const email = await requireAdmin(_req)
  if (!email) return unauthorized()
  return json({ authenticated: true, email })
}
