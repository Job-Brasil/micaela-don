/**
 * Internationalization — server-safe, client-side state.
 *
 * Supported locales: pt-PT, pt-BR, en.
 * The locale is determined by (in order):
 *   1. localStorage 'ajudar.locale' (user's previous choice)
 *   2. navigator.language / navigator.languages
 *   3. default 'pt-PT'
 *
 * Country → locale/currency suggestions:
 *   BR → pt-BR, BRL
 *   PT → pt-PT, EUR
 *   others → en, EUR (with country-specific overrides where applicable)
 */

export type Locale = 'pt-PT' | 'pt-BR' | 'en'

export type CountryInfo = {
  code: string
  name: string
  flag: string
  locale: Locale
  currency: 'EUR' | 'BRL'
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', locale: 'pt-PT', currency: 'EUR' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', locale: 'pt-BR', currency: 'BRL' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', locale: 'en', currency: 'EUR' },
  { code: 'FR', name: 'França', flag: '🇫🇷', locale: 'en', currency: 'EUR' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', locale: 'en', currency: 'EUR' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', locale: 'en', currency: 'EUR' },
  { code: 'NL', name: 'Países Baixos', flag: '🇳🇱', locale: 'en', currency: 'EUR' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', locale: 'en', currency: 'EUR' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', locale: 'en', currency: 'EUR' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', locale: 'pt-PT', currency: 'EUR' },
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿', locale: 'pt-PT', currency: 'EUR' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻', locale: 'pt-PT', currency: 'EUR' },
]

export function getCountry(code: string): CountryInfo {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]
}

/**
 * Detects the suggested country from browser locale (no geolocation).
 */
export function detectCountry(): string {
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || navigator.languages?.[0] || '').toLowerCase()
    if (lang.includes('br')) return 'BR'
    if (lang.startsWith('pt')) return 'PT'
  }
  return 'PT'
}

export function detectLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ajudar.locale') as Locale | null
    if (stored && ['pt-PT', 'pt-BR', 'en'].includes(stored)) return stored
  }
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase()
    if (lang.includes('br')) return 'pt-BR'
    if (lang.startsWith('pt')) return 'pt-PT'
  }
  return 'pt-PT'
}

// --- Translation strings ---
type Dict = Record<string, string>

const ptPT: Dict = {
  'donate.title': 'Apoiar esta campanha',
  'donate.context': 'Cada contribuição é um gesto concreto de cuidado.',
  'donate.currency': 'Moeda',
  'donate.amount': 'Valor',
  'donate.custom': 'Outro valor',
  'donate.minMax': 'Mínimo {min} · Máximo {max}',
  'donate.name': 'Nome',
  'donate.email': 'Email',
  'donate.email.hint': 'Necessário para enviar a confirmação e o agradecimento.',
  'donate.whatsapp': 'WhatsApp (opcional)',
  'donate.cpf': 'CPF/CNPJ (apenas para PIX automático)',
  'donate.country': 'País / Região',
  'donate.method': 'Método de pagamento',
  'donate.method.none': 'Nenhum método disponível para esta moeda.',
  'donate.method.none.hint': 'Pode ainda registar uma intenção de pagamento manual.',
  'donate.pack': 'Quero receber o Pack Media de agradecimento pelo meu apoio.',
  'donate.pack.hint': 'O pack contém materiais digitais de agradecimento e será enviado por email após a confirmação do pagamento.',
  'donate.pack.note': 'Esta opção não constitui consentimento para comunicações promocionais.',
  'donate.submit': 'Confirmar e pagar',
  'donate.submitting': 'A processar…',
  'donate.summary': 'Resumo',
  'donate.summary.campaign': 'Campanha',
  'donate.summary.amount': 'Valor',
  'donate.summary.method': 'Método',
  'donate.summary.name': 'Nome',
  'donate.summary.email': 'Email',
  'donate.summary.pack': 'Pack Media',
  'donate.yes': 'Sim',
  'donate.no': 'Não',
  'donate.back': 'Voltar',
  'donate.confirm.security': 'O apoio só será confirmado após validação do pagamento.',
  'result.title': 'Intenção registada',
  'result.desc': 'Aguarde confirmação. Este formulário não comprova pagamento.',
  'result.reference': 'Referência',
  'result.waiting': 'Aguarde confirmação administrativa.',
  'pix.title': 'Pagamento via PIX',
  'pix.beneficiary': 'Beneficiário',
  'pix.instructions': 'Leia o QR Code com a sua app de banco para pagar.',
  'pix.waiting': 'O pagamento aguarda confirmação.',
  'iban.title': 'Dados para transferência (IBAN)',
  'iban.holder': 'Titular',
  'iban.bank': 'Banco',
  'iban.iban': 'IBAN',
  'iban.bic': 'BIC/SWIFT',
  'iban.copy': 'Copiar',
  'iban.instructions': 'Efetue a transferência e aguarde confirmação administrativa.',
  'method.mbway': 'MB WAY',
  'method.mbway.desc': 'Pagamento instantâneo via Stripe',
  'method.pix_automatic': 'PIX Automático',
  'method.pix_automatic.desc': 'QR Code gerado automaticamente',
  'method.pix_manual': 'PIX Manual',
  'method.pix_manual.desc': 'QR Code e código Copia e Cola',
  'method.bank_transfer': 'Transferência Bancária',
  'method.bank_transfer.desc': 'IBAN (SEPA)',
}

const ptBR: Dict = {
  ...ptPT,
  'donate.title': 'Apoiar esta campanha',
  'donate.context': 'Cada contribuição é um gesto concreto de cuidado.',
  'donate.email.hint': 'Necessário para enviar a confirmação e o agradecimento.',
  'donate.method.none': 'Nenhum método disponível para esta moeda.',
  'result.waiting': 'Aguarde confirmação administrativa.',
  'pix.instructions': 'Leia o QR Code com o seu app de banco para pagar.',
  'iban.instructions': 'Faça a transferência e aguarde confirmação administrativa.',
}

const en: Dict = {
  'donate.title': 'Support this campaign',
  'donate.context': 'Every contribution is a concrete gesture of care.',
  'donate.currency': 'Currency',
  'donate.amount': 'Amount',
  'donate.custom': 'Other amount',
  'donate.minMax': 'Minimum {min} · Maximum {max}',
  'donate.name': 'Name',
  'donate.email': 'Email',
  'donate.email.hint': 'Required to send confirmation and thank-you.',
  'donate.whatsapp': 'WhatsApp (optional)',
  'donate.cpf': 'CPF/CNPJ (only for automatic PIX)',
  'donate.country': 'Country / Region',
  'donate.method': 'Payment method',
  'donate.method.none': 'No method available for this currency.',
  'donate.method.none.hint': 'You can still register a manual payment intent.',
  'donate.pack': 'I want to receive the Media Pack as a thank-you for my support.',
  'donate.pack.hint': 'The pack contains digital thank-you materials and will be sent by email after payment confirmation.',
  'donate.pack.note': 'This option does not constitute consent for promotional communications.',
  'donate.submit': 'Confirm and pay',
  'donate.submitting': 'Processing…',
  'donate.summary': 'Summary',
  'donate.summary.campaign': 'Campaign',
  'donate.summary.amount': 'Amount',
  'donate.summary.method': 'Method',
  'donate.summary.name': 'Name',
  'donate.summary.email': 'Email',
  'donate.summary.pack': 'Media Pack',
  'donate.yes': 'Yes',
  'donate.no': 'No',
  'donate.back': 'Back',
  'donate.confirm.security': 'Support will only be confirmed after payment validation.',
  'result.title': 'Intent registered',
  'result.desc': 'Awaiting confirmation. This form does not prove payment.',
  'result.reference': 'Reference',
  'result.waiting': 'Awaiting administrative confirmation.',
  'pix.title': 'PIX payment',
  'pix.beneficiary': 'Beneficiary',
  'pix.instructions': 'Scan the QR Code with your banking app to pay.',
  'pix.waiting': 'Payment awaiting confirmation.',
  'iban.title': 'Bank transfer details (IBAN)',
  'iban.holder': 'Holder',
  'iban.bank': 'Bank',
  'iban.iban': 'IBAN',
  'iban.bic': 'BIC/SWIFT',
  'iban.copy': 'Copy',
  'iban.instructions': 'Make the transfer and await administrative confirmation.',
  'method.mbway': 'MB WAY',
  'method.mbway.desc': 'Instant payment via Stripe',
  'method.pix_automatic': 'Automatic PIX',
  'method.pix_automatic.desc': 'Automatically generated QR Code',
  'method.pix_manual': 'Manual PIX',
  'method.pix_manual.desc': 'QR Code and copy-paste code',
  'method.bank_transfer': 'Bank Transfer',
  'method.bank_transfer.desc': 'IBAN (SEPA)',
}

const DICTS: Record<Locale, Dict> = { 'pt-PT': ptPT, 'pt-BR': ptBR, en }

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let str = DICTS[locale]?.[key] ?? DICTS['pt-PT'][key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}

export function formatAmount(amountMinor: number, currency: string, locale: Locale): string {
  const localeStr = locale === 'pt-BR' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'pt-PT'
  return new Intl.NumberFormat(localeStr, { style: 'currency', currency }).format(amountMinor / 100)
}
