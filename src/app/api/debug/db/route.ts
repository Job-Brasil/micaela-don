import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { json } from '@/lib/api'

/**
 * TEMPORARY diagnostic endpoint — identifies the exact Prisma error in production.
 * Returns ONLY: whether the client initialized, whether the query succeeded, and the
 * Prisma error code/name. NEVER returns connection strings, passwords, or data.
 *
 * Safe to expose: no auth required (returns no data, only error metadata).
 * Remove after diagnosis is complete.
 */
export async function GET(_req: NextRequest) {
  const result: {
    env: { hasDatabaseUrl: boolean; scheme: string; isPostgres: boolean; hasDirectUrl: boolean }
    clientCreated: boolean
    querySucceeded: boolean
    errorCode: string | null
    errorName: string | null
    errorSanitized: string | null
  } = {
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      scheme: process.env.DATABASE_URL ? process.env.DATABASE_URL.split(':')[0] : 'none',
      isPostgres: process.env.DATABASE_URL?.startsWith('postgres') ?? false,
      hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
    },
    clientCreated: false,
    querySucceeded: false,
    errorCode: null,
    errorName: null,
    errorSanitized: null,
  }

  try {
    const client = new PrismaClient()
    result.clientCreated = true
    try {
      const count = await client.siteSetting.count()
      result.querySucceeded = true
      // Return count (not data) to confirm connectivity without exposing content
      return json({ ...result, rowCount: count })
    } catch (queryErr) {
      const code = (queryErr as { code?: string })?.code ?? null
      const name = (queryErr as { name?: string })?.name ?? null
      // Sanitize: strip any URL from the message
      const raw = (queryErr as { message?: string })?.message ?? ''
      const safe = raw.replace(/(?:postgres(?:ql)?|file):\/\/[^\s]+/gi, '[REDACTED]')
      result.errorCode = code
      result.errorName = name
      result.errorSanitized = safe.slice(0, 300)
      return json(result, { status: 500 })
    } finally {
      await client.$disconnect()
    }
  } catch (initErr) {
    const name = (initErr as { name?: string })?.name ?? null
    const raw = (initErr as { message?: string })?.message ?? ''
    const safe = raw.replace(/(?:postgres(?:ql)?|file):\/\/[^\s]+/gi, '[REDACTED]')
    result.errorName = name
    result.errorSanitized = safe.slice(0, 300)
    return json(result, { status: 500 })
  }
}
