import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, unauthorized } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req)
  if (!email) return unauthorized()
  const donations = await db.donationIntent.findMany({ orderBy: { createdAt: 'desc' } })
  return json({ donations })
}
