import { db } from '@/lib/db'

/**
 * Append an entry to the audit log. Server-only.
 */
export async function audit(params: {
  actor: string
  action: string
  entity?: string
  entityId?: string
  detail?: string
  ip?: string | null
}) {
  try {
    await db.auditLog.create({
      data: {
        actor: params.actor,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        detail: params.detail,
        ip: params.ip ?? null,
      },
    })
  } catch (e) {
    // Audit must never break the request, but should be logged.
    console.error('[audit] failed to write audit log', e)
  }
}
