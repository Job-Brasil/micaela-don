import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { json } from '@/lib/api'

/**
 * TEMPORARY diagnostic endpoint — tests each table individually to identify
 * which query in getPublicSite() is failing. Returns ONLY error codes/names
 * (sanitized, no connection strings or data). Remove after diagnosis.
 */
export async function GET(_req: NextRequest) {
  const client = new PrismaClient()
  const results: Record<string, { ok: boolean; count?: number; code?: string | null; msg?: string }> = {}

  const tables: Array<{ key: string; fn: () => Promise<unknown> }> = [
    { key: 'siteSetting', fn: () => client.siteSetting.count() },
    { key: 'paymentConfig', fn: () => client.paymentConfig.count() },
    { key: 'pixConfig', fn: () => client.pixConfig.count() },
    { key: 'campaignMaterial', fn: () => client.campaignMaterial.count() },
    { key: 'contactChannel', fn: () => client.contactChannel.count() },
  ]

  for (const { key, fn } of tables) {
    try {
      const count = await fn()
      results[key] = { ok: true, count: count as number }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? null
      const raw = (err as { message?: string })?.message ?? ''
      const safe = raw.replace(/(?:postgres(?:ql)?|file):\/\/[^\s]+/gi, '[REDACTED]').slice(0, 200)
      results[key] = { ok: false, code, msg: safe }
    }
  }

  await client.$disconnect()
  return json({
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      isPostgres: process.env.DATABASE_URL?.startsWith('postgres') ?? false,
    },
    results,
  })
}
