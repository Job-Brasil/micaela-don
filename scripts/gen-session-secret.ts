/**
 * Generate a random SESSION_SECRET for .env.
 * Usage: bun run scripts/gen-session-secret.ts
 */
import { randomBytes } from 'node:crypto'
console.log(randomBytes(48).toString('base64url'))
