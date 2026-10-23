import { NextRequest } from 'next/server'
import { getPublicSite } from '@/lib/public-data'
import { json } from '@/lib/api'

/** Public site payload (mirror of getPublicSite). */
export async function GET(_req: NextRequest) {
  const data = await getPublicSite()
  return json(data)
}
