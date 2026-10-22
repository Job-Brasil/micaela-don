/**
 * Generate a scrypt password hash for ADMIN_PASSWORD_HASH.
 * Usage: bun run scripts/hash-password.ts "<password>"
 * Output: scrypt:<saltHex>:<hashHex>   (copy into .env as ADMIN_PASSWORD_HASH)
 */
import { scryptSync, randomBytes } from 'node:crypto'

const plain = process.argv[2]
if (!plain || plain.length < 8) {
  console.error('Forneça uma password com pelo menos 8 caracteres.')
  process.exit(1)
}
const salt = randomBytes(16)
const hash = scryptSync(plain, salt, 32)
console.log(`scrypt:${salt.toString('hex')}:${hash.toString('hex')}`)
