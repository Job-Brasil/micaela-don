import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** TEMPORARY: diagnose which columns/tables exist in production. */
export async function GET(_req: NextRequest) {
  const results: Record<string, unknown> = {}

  // Test each table/column
  const tests = [
    { name: 'site_setting.findMany', fn: () => db.siteSetting.findMany({ take: 1 }) },
    { name: 'site_setting.raw campaign_id', fn: () => db.$queryRawUnsafe('SELECT campaign_id FROM site_setting LIMIT 0') },
    { name: 'payment_config.findFirst', fn: () => db.paymentConfig.findFirst() },
    { name: 'pix_config.findFirst', fn: () => db.pixConfig.findFirst() },
    { name: 'campaign.count', fn: () => db.campaign.count() },
    { name: 'campaign_material raw basic', fn: () => db.$queryRawUnsafe('SELECT id, name FROM campaign_material LIMIT 0') },
  ]

  for (const t of tests) {
    try {
      const r = await t.fn()
      results[t.name] = { ok: true, sample: Array.isArray(r) ? r.length : typeof r }
    } catch (e) {
      const code = (e as { code?: string })?.code
      const msg = (e as { message?: string })?.message ?? ''
      results[t.name] = { ok: false, code, message: msg.slice(0, 200) }
    }
  }

  return NextResponse.json(results)
}
