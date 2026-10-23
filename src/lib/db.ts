import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

/**
 * Prisma client singleton (lazy initialization).
 *
 * Configuration requirements:
 *  - PRODUCTION (Vercel + Supabase): DATABASE_URL is a PostgreSQL connection string.
 *    The Prisma schema (prisma/schema.prisma) uses provider = "postgresql".
 *  - LOCAL DEV (sandbox): DATABASE_URL points to a SQLite file. The Prisma schema
 *    used for dev is prisma/schema.dev.prisma (provider = "sqlite"), selected via
 *    the db:*:dev scripts. The generated @prisma/client must match the provider of
 *    the schema used to generate it.
 *
 * Lazy init: the PrismaClient is created on first use, NOT at module import time.
 * This avoids failing the Next.js build's "collect page data" step (which evaluates
 * server modules with NODE_ENV=production but without a real DB connection).
 *
 * Logging:
 *  - In development: query + error + warn logs.
 *  - In production: error + warn logs only (avoid leaking query details in server logs).
 */

function resolveLogLevels(): Prisma.PrismaClientOptions['log'] {
  if (process.env.NODE_ENV === 'production') {
    return ['error', 'warn']
  }
  return ['query', 'error', 'warn']
}

function assertDatabaseUrl(): void {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[db] FATAL: DATABASE_URL is not set. ' +
        'In production, set it to the Supabase PostgreSQL connection string (with ?pgbouncer=true&connection_limit=1). ' +
        'In dev, run `bun run db:push:dev` after setting DATABASE_URL in .env.',
    )
  }
  const isPostgres = url.startsWith('postgres')
  const isSqlite = url.startsWith('file:')
  if (!isPostgres && !isSqlite) {
    // Never print the URL (it may contain the password).
    throw new Error(
      `[db] FATAL: DATABASE_URL has an unsupported scheme ("${url.split(':')[0]}:"). ` +
        'Use "file:..." for SQLite dev or "postgresql://..." for Postgres.',
    )
  }
}

const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined
}

/**
 * Lazily creates and returns the singleton PrismaClient. The DB URL is validated
 * here (not at import time) so the build doesn't fail during static analysis.
 */
function getClient(): PrismaClient {
  if (globalForPrisma.__prismaClient) {
    return globalForPrisma.__prismaClient
  }
  assertDatabaseUrl()
  const client = new PrismaClient({
    log: resolveLogLevels(),
  })
  globalForPrisma.__prismaClient = client
  return client
}

/**
 * Proxy that forwards property access to the lazily-created PrismaClient.
 * This keeps the ergonomic `db.model.findMany()` API while deferring creation.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
