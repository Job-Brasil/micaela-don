/**
 * Seed script — idempotent and safe.
 *
 * Reads initial sensitive data from .env (gitignored), NEVER from code.
 * Seeds everything as DRAFT / DISABLED so nothing is public until an
 * authorized admin explicitly verifies and publishes it.
 *
 * USAGE:
 *   - Dev (SQLite sandbox):   bun run seed:dev
 *   - Prod (PostgreSQL):      bun run seed
 *
 * The --dev flag forces the dev behavior. Without it, the script refuses to run
 * unless DATABASE_URL looks like PostgreSQL (production). It NEVER destroys data.
 *
 * Idempotency: every operation uses upsert with update:{} (create-only). Re-running
 * does NOT overwrite existing values — so admin edits are preserved.
 */
import { db } from '../src/lib/db'

const isDev = process.argv.includes('--dev')
const url = process.env.DATABASE_URL ?? ''
const urlIsPostgres = url.startsWith('postgres') || url.startsWith('postgresql')

if (!isDev && !urlIsPostgres) {
  console.error(
    '[seed] ABORTED: DATABASE_URL is not a PostgreSQL connection string.\n' +
      '  - For local SQLite dev, run:  bun run seed:dev\n' +
      '  - For production PostgreSQL, ensure DATABASE_URL points to Supabase and run: bun run seed',
  )
  process.exit(1)
}

if (isDev && urlIsPostgres) {
  console.warn(
    '[seed] WARNING: --dev flag set but DATABASE_URL looks like PostgreSQL. ' +
      'Proceeding against a PostgreSQL database in dev mode.',
  )
}

console.log(`[seed] target: ${isDev ? 'dev' : 'production'} (${urlIsPostgres ? 'PostgreSQL' : 'SQLite'})`)

async function main() {
  // 0) Default campaign (Micaela) — idempotent create-only.
  await db.campaign.upsert({
    where: { id: 'micaela' },
    update: {},
    create: {
      id: 'micaela',
      slug: 'micaela',
      name: 'A história da Micaela',
      status: 'published',
      isDefault: true,
      currency: 'EUR',
      country: 'PT',
    },
  })

  // 1) Site settings (editable public text). Sensible Portuguese placeholders.
  //    create-only: if an admin already edited a value, it is preserved.
  const settings: Record<string, string> = {
    'hero.eyebrow': 'Campanha de solidariedade',
    'hero.title': 'Um Gesto de Apoio — A história da Micaela',
    'hero.subtitle':
      'Cada contribuição é um gesto concreto de cuidado. Obrigado por fazer parte deste caminho.',
    'story.title': 'A história da Micaela',
    'story.body':
      'Esta página partilha a história da Micaela e abre um canal transparente para quem deseja apoiar. Os dados de pagamento são apresentados apenas após verificação administrativa, e cada intenção de donativo é confirmada manualmente — um formulário submetido não comprova pagamento.',
    'donate.title': 'Como apoiar',
    'donate.note':
      'A confirmação de qualquer donativo é administrativa. Submeter o formulário não comprova pagamento.',
    'materials.title': 'Materiais da campanha',
    'footer.note': 'Um Gesto de Apoio · A história da Micaela',
  }
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }

  // 2) EUR payment config — DRAFT (not approved, not published). Read from env.
  //    create-only: preserves admin edits to real bank data.
  const holder = process.env.INIT_PAYMENT_HOLDER
  const bank = process.env.INIT_PAYMENT_BANK
  const iban = process.env.INIT_PAYMENT_IBAN
  const bic = process.env.INIT_PAYMENT_BIC
  const method = process.env.INIT_PAYMENT_METHOD ?? 'Transferência bancária SEPA'
  const currency = process.env.INIT_PAYMENT_CURRENCY ?? 'EUR'
  if (holder && bank && iban) {
    await db.paymentConfig.upsert({
      where: { id: 'payment-eur' },
      update: {},
      create: {
        id: 'payment-eur',
        currency,
        holder,
        bank,
        iban,
        bic: bic ?? null,
        method,
        published: false,
        approved: false,
        notes: 'Configuração inicial carregada do .env — pendente de verificação administrativa.',
      },
    })
  } else {
    console.warn('[seed] INIT_PAYMENT_* não definido no .env — PaymentConfig não criado.')
  }

  // 3) PIX config — empty draft. The admin uploads the QR image and approves it.
  await db.pixConfig.upsert({
    where: { id: 'pix-brl' },
    update: {},
    create: {
      id: 'pix-brl',
      qrImageData: null,
      qrImageMime: null,
      beneficiaryName: null,
      approved: false,
      published: false,
      notes: 'Aguarda carregamento e verificação do QR Code pelo administrador.',
    },
  })

  // 4) WhatsApp contact channel — DISABLED + UNPUBLISHED by default. Value from env.
  const waLabel = process.env.INIT_WHATSAPP_LABEL
  const waValue = process.env.INIT_WHATSAPP_VALUE
  if (waLabel && waValue) {
    await db.contactChannel.upsert({
      where: { id: 'whatsapp-main' },
      update: {},
      create: {
        id: 'whatsapp-main',
        type: 'whatsapp',
        label: waLabel,
        value: waValue,
        enabled: false,
        published: false,
      },
    })
  }

  // 5) Default thank-you template (email channel). Editable by admin.
  await db.thankYouTemplate.upsert({
    where: { id: 'thank-default-email' },
    update: {},
    create: {
      id: 'thank-default-email',
      channel: 'email',
      language: 'pt',
      subject: 'Obrigado pelo seu gesto de apoio',
      body:
        'Recebemos o seu registo de intenção de donativo. Agradecemos imensamente o seu gesto. A confirmação será efetuada administrativamente.',
      active: true,
    },
  })

  console.log('[seed] concluído. Tudo em rascunho / desativado. Dados existentes preservados.')
}

main()
  .catch((e) => {
    console.error('[seed] ERRO:', e?.message ?? e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
