/**
 * postinstall generate wrapper.
 *
 * Determines the correct Prisma schema to generate the client from, based on
 * DATABASE_URL:
 *   - file:...        → prisma/schema.dev.prisma  (SQLite, local dev/sandbox)
 *   - postgresql:...  → prisma/schema.prisma       (PostgreSQL, production/Vercel)
 *   - postgres:...    → prisma/schema.prisma       (PostgreSQL, production/Vercel)
 *
 * This avoids the "provider mismatch" error where the Vercel build generated a
 * SQLite client but ran against a PostgreSQL database (or vice-versa).
 *
 * If DATABASE_URL is unset, default to the production schema (postgresql) since
 * postinstall runs in the Vercel build environment where DATABASE_URL is expected.
 */
import { execSync } from 'node:child_process'

const url = process.env.DATABASE_URL ?? ''
const isSqlite = url.startsWith('file:')
const schema = isSqlite ? 'prisma/schema.dev.prisma' : 'prisma/schema.prisma'

console.log(`[postinstall] generating Prisma client from ${schema}`)

try {
  execSync(`prisma generate --schema ${schema}`, { stdio: 'inherit' })
} catch (e) {
  // Don't fail the whole install on a generate error in CI; surface the message.
  console.error('[postinstall] prisma generate failed:', e instanceof Error ? e.message : e)
  process.exitCode = 1
}
