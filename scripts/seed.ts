/**
 * Seed script — idempotent. Reads initial sensitive data from .env (gitignored),
 * NEVER from code. Seeds everything as DRAFT / DISABLED so nothing is public until
 * an authorized admin explicitly verifies and publishes it.
 *
 * Run: bun run scripts/seed.ts
 */
import { db } from '../src/lib/db'

async function main() {
  // 1) Site settings (editable public text). Sensible Portuguese placeholders.
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

  console.log('[seed] concluído. Tudo em rascunho / desativado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
