'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { loadStripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js'
import { toast } from 'sonner'
import {
  Heart,
  Check,
  ShieldCheck,
  Loader2,
  Landmark,
  QrCode,
  CreditCard,
  Copy,
  Package,
  AlertCircle,
  ArrowRight,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  translate,
  detectCountry,
  detectLocale,
  formatAmount,
  COUNTRIES,
  getCountry,
  type Locale,
} from '@/lib/i18n'

type PaymentMethodsResponse = {
  methods: {
    mbway: { available: boolean; currencies: string[]; reason?: string | null }
    pix_automatic: { available: boolean; currencies: string[]; reason?: string | null }
    pix_manual: { available: boolean; currencies: string[]; beneficiaryName?: string | null }
    bank_transfer: {
      available: boolean
      currencies: string[]
      holder?: string | null
      bank?: string | null
      iban?: string | null
      bic?: string | null
    }
  }
  suggestedAmounts: Record<string, number[]>
  limits: Record<string, { minMinor: number; maxMinor: number }>
}

type MethodKey = 'mbway' | 'pix_automatic' | 'pix_manual' | 'bank_transfer'

type PixGoResult = {
  reference: string
  paymentId: string
  qrCode: string | null
  qrCodeImage: string | null
  expiresAt: string | null
}

const METHOD_ICONS: Record<MethodKey, typeof Landmark> = {
  mbway: CreditCard,
  pix_automatic: QrCode,
  pix_manual: QrCode,
  bank_transfer: Landmark,
}

const LOCALE_LABELS: Record<Locale, string> = {
  'pt-PT': 'PT',
  'pt-BR': 'BR',
  en: 'EN',
}

export function DonationFlow({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const [methods, setMethods] = useState<PaymentMethodsResponse | null>(null)
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [locale, setLocale] = useState<Locale>('pt-PT')
  const [country, setCountry] = useState('PT')

  // Form state — single page, no multi-step
  const [currency, setCurrency] = useState<'EUR' | 'BRL'>('EUR')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [cpf, setCpf] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [wantPackMedia, setWantPackMedia] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    id: string
    paymentMethod: string
    status: string
  } | null>(null)

  // Stripe embedded checkout state
  const [embeddedCheckoutActive, setEmbeddedCheckoutActive] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null)

  // PixGo inline QR result
  const [pixgoResult, setPixgoResult] = useState<PixGoResult | null>(null)

  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(locale, key, params), [locale])

  // Detect locale + country on mount (does NOT lock currency to campaign — donor can switch freely)
  useEffect(() => {
    const l = detectLocale()
    const c = detectCountry()
    setLocale(l)
    setCountry(c)
    const info = getCountry(c)
    setCurrency(info.currency)
  }, [])

  // Persist locale choice
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ajudar.locale', locale)
    }
  }, [locale])

  // Fetch payment methods (currency is selected by the donor, not forced by the campaign)
  useEffect(() => {
    fetch(`/api/public/payment-methods?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => r.json())
      .then((d) => setMethods(d))
      .catch(() => {})
      .finally(() => setLoadingMethods(false))
  }, [campaignId])

  // Cleanup embedded checkout when component unmounts
  useEffect(() => {
    return () => {
      if (checkoutRef.current) {
        try {
          checkoutRef.current.destroy()
        } catch {
          // ignore — may already be destroyed
        }
        checkoutRef.current = null
      }
    }
  }, [])

  const handleCountryChange = (c: string) => {
    setCountry(c)
    const info = getCountry(c)
    setCurrency(info.currency)
    setLocale(info.locale)
    setSelectedAmount(null)
    setCustomAmount('')
    setPaymentMethod('')
  }

  const handleLocaleChange = (l: Locale) => {
    setLocale(l)
  }

  const amountMinor = useMemo(() => {
    if (customAmount) return Math.round(Number(customAmount) * 100)
    if (selectedAmount) return Math.round(selectedAmount * 100)
    return 0
  }, [selectedAmount, customAmount])

  const formattedAmount = useMemo(() => formatAmount(amountMinor, currency, locale), [amountMinor, currency, locale])

  const limits = methods?.limits?.[currency] ?? { minMinor: 100, maxMinor: 1000000 }
  const suggested = methods?.suggestedAmounts?.[currency] ?? (currency === 'BRL' ? [20, 50, 100, 200] : [5, 10, 20, 50])

  // Available methods filtered by currency support (currency is NOT locked to the campaign)
  const availableMethods = useMemo(() => {
    if (!methods) return []
    return Object.entries(methods.methods)
      .filter(([, info]) => info.available && Array.isArray(info.currencies) && info.currencies.includes(currency))
      .map(([key, info]) => ({ key: key as MethodKey, ...info }))
  }, [methods, currency])

  // Auto-select first available method when currency/methods change
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.find((m) => m.key === paymentMethod)) {
      setPaymentMethod(availableMethods[0].key)
    }
    if (availableMethods.length === 0) {
      setPaymentMethod('')
    }
  }, [availableMethods, paymentMethod])

  const symbol = currency === 'BRL' ? 'R$' : '€'

  const amountValid = amountMinor >= limits.minMinor && amountMinor <= limits.maxMinor
  const nameValid = name.trim().length >= 2
  const emailValid = /\S+@\S+\.\S+/.test(email)
  const whatsappValid = !whatsapp || /^\+?\d{8,15}$/.test(whatsapp.replace(/[\s\-()]/g, ''))
  // CPF is required ONLY for pix_automatic (PixGo requires it)
  const cpfRequired = paymentMethod === 'pix_automatic'
  const cpfValid = !cpfRequired || /^\d{11}$|^\d{14}$/.test(cpf.replace(/\D/g, ''))

  const canSubmit = amountValid && nameValid && emailValid && whatsappValid && cpfValid && !!paymentMethod

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      // 1) Create donation intent (server-side validates amountMinor, currency, method compatibility)
      const res = await fetch('/api/public/donation-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          currency,
          amountMinor,
          donorName: name.trim(),
          donorEmail: email.trim(),
          donorWhatsapp: whatsapp.trim() || undefined,
          donorCountry: country,
          paymentMethod,
          wantPackMedia,
          message: message.trim() || undefined,
          consentChannels: ['email'],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao registar intenção')

      setResult({ id: data.id, paymentMethod: data.paymentMethod, status: data.status })

      // 2a) MB WAY → Stripe Embedded Checkout (no redirect)
      if (paymentMethod === 'mbway') {
        const stripeRes = await fetch('/api/payments/stripe/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            amount: amountMinor / 100,
            currency,
            customerEmail: email.trim(),
            customerName: name.trim(),
          }),
        })
        const stripeData = await stripeRes.json()
        if (!stripeRes.ok || !stripeData.clientSecret) {
          throw new Error(stripeData?.error ?? 'Não foi possível iniciar o pagamento Stripe.')
        }

        // Fallback: if no publishable key is configured, we cannot mount embedded checkout.
        // The API no longer returns a `url`, so we cannot redirect to checkout.stripe.com.
        if (typeof window !== 'undefined') {
          const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
          if (!pk) {
            toast.error('Stripe não configurado para checkout embutido. Contacte o suporte.')
            return
          }

          setStripeLoading(true)
          try {
            const stripe = await loadStripe(pk)
            if (!stripe) {
              throw new Error('Stripe indisponível')
            }

            // Stripe.js exposes initEmbeddedCheckout (older) or createEmbeddedCheckoutPage (v10+).
            // Try both at runtime to be resilient across versions.
            const stripeAny = stripe as unknown as {
              initEmbeddedCheckout?: (opts: { clientSecret: string }) => Promise<StripeEmbeddedCheckout>
              createEmbeddedCheckoutPage?: (opts: { clientSecret: string }) => Promise<StripeEmbeddedCheckout>
            }

            let checkout: StripeEmbeddedCheckout
            if (typeof stripeAny.initEmbeddedCheckout === 'function') {
              checkout = await stripeAny.initEmbeddedCheckout({ clientSecret: stripeData.clientSecret })
            } else if (typeof stripeAny.createEmbeddedCheckoutPage === 'function') {
              checkout = await stripeAny.createEmbeddedCheckoutPage({ clientSecret: stripeData.clientSecret })
            } else {
              throw new Error('Stripe embedded checkout indisponível nesta versão.')
            }

            // Destroy any previous instance before mounting a new one
            if (checkoutRef.current) {
              try {
                checkoutRef.current.destroy()
              } catch {
                // ignore
              }
            }
            checkout.mount('#stripe-checkout-container')
            checkoutRef.current = checkout
            setEmbeddedCheckoutActive(true)
            // On success, Stripe redirects to return_url (/pagamento/sucesso?ref=...) automatically.
          } finally {
            setStripeLoading(false)
          }
        }
        return
      }

      // 2b) PixGo → create PIX charge, render QR inline
      if (paymentMethod === 'pix_automatic') {
        const pixgoRes = await fetch('/api/payments/pixgo/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            amount: amountMinor / 100,
            currency: 'BRL',
            customerEmail: email.trim(),
            customerName: name.trim(),
            customerCpf: cpf.replace(/\D/g, ''),
            description: `Apoio — ${campaignName}`,
          }),
        })
        const pixgoData = await pixgoRes.json()
        if (!pixgoRes.ok) {
          throw new Error(pixgoData?.error ?? 'Não foi possível criar o pagamento PIX.')
        }
        setPixgoResult({
          reference: pixgoData.reference,
          paymentId: pixgoData.paymentId,
          qrCode: pixgoData.qrCode ?? null,
          qrCodeImage: pixgoData.qrCodeImage ?? null,
          expiresAt: pixgoData.expiresAt ?? null,
        })
        toast.success(t('result.title'), { description: t('pixgo.waiting') })
        return
      }

      // Manual methods (pix_manual, bank_transfer) — inline result with QR or IBAN
      toast.success(t('result.title'), { description: t('result.desc') })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao submeter')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingMethods) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> A preparar…
      </div>
    )
  }

  // Stripe embedded checkout is loading (Stripe.js being initialized)
  if (stripeLoading) {
    return (
      <Card className="border-stone-200/70 dark:border-stone-800/70">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          <p className="text-sm font-medium">{t('stripe.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  // Stripe embedded checkout is mounted inline — show the iframe container
  if (embeddedCheckoutActive) {
    return (
      <Card className="overflow-hidden border-stone-200/70 shadow-sm dark:border-stone-800/70">
        <CardHeader className="border-b bg-gradient-to-r from-rose-50 to-amber-50/50 pb-5 dark:from-rose-950/20 dark:to-amber-950/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-rose-600" />
            {t('stripe.embedded.title')}
          </CardTitle>
          <CardDescription>
            {campaignName} — {t('stripe.embedded.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Stripe Embedded Checkout iframe mounts here */}
          <div
            id="stripe-checkout-container"
            className="min-h-[520px] w-full"
            aria-label="Stripe embedded checkout"
          />
        </CardContent>
      </Card>
    )
  }

  // PixGo result — inline QR + Copia e Cola
  if (pixgoResult) {
    return (
      <PixGoPaymentResult
        result={pixgoResult}
        campaignName={campaignName}
        t={t}
      />
    )
  }

  // Manual methods (PIX manual, IBAN) — existing inline result
  if (result && (result.paymentMethod === 'pix_manual' || result.paymentMethod === 'bank_transfer')) {
    return (
      <ManualPaymentResult
        result={result}
        methods={methods}
        campaignName={campaignName}
        locale={locale}
        t={t}
      />
    )
  }

  return (
    <Card className="overflow-hidden border-stone-200/70 shadow-sm dark:border-stone-800/70">
      <CardHeader className="border-b bg-gradient-to-r from-rose-50 to-amber-50/50 pb-5 dark:from-rose-950/20 dark:to-amber-950/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-rose-600" />
              {t('donate.title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {campaignName} — {t('donate.context')}
            </CardDescription>
          </div>
          {/* Country + locale selectors */}
          <div className="flex items-center gap-2">
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger className="h-9 w-auto gap-1.5" aria-label={t('donate.country')}>
                <span className="text-base leading-none">{getCountry(country).flag}</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="mr-1.5">{c.flag}</span> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locale} onValueChange={(v) => handleLocaleChange(v as Locale)}>
              <SelectTrigger className="h-9 w-16" aria-label="Language">
                <Globe className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-PT">🇵🇹 PT</SelectItem>
                <SelectItem value="pt-BR">🇧🇷 BR</SelectItem>
                <SelectItem value="en">🇬🇧 EN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Currency + Value selection (donor chooses EUR or BRL freely) */}
        <section>
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('donate.currency')}
          </Label>
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              variant={currency === 'EUR' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCurrency('EUR'); setSelectedAmount(null); setCustomAmount('') }}
            >
              € EUR
            </Button>
            <Button
              type="button"
              variant={currency === 'BRL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCurrency('BRL'); setSelectedAmount(null); setCustomAmount('') }}
            >
              R$ BRL
            </Button>
          </div>
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('donate.amount')}
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {suggested.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                className={`relative rounded-xl border-2 p-3 text-center transition-all hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 ${
                  selectedAmount === amt && !customAmount
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/20'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
              >
                {selectedAmount === amt && !customAmount && (
                  <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-rose-600" />
                )}
                <span className="text-base font-bold">{symbol} {amt}</span>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Label htmlFor="custom-amount" className="mb-1 block text-xs text-muted-foreground">
              {t('donate.custom')}
            </Label>
            <div className="relative max-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
              <Input
                id="custom-amount"
                type="number"
                min={(limits.minMinor / 100).toFixed(2)}
                max={(limits.maxMinor / 100).toFixed(2)}
                step="0.01"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('donate.minMax', { min: `${symbol}${(limits.minMinor / 100).toFixed(2)}`, max: `${symbol}${(limits.maxMinor / 100).toFixed(2)}` })}
            </p>
          </div>
          {amountValid && amountMinor > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-sm dark:bg-rose-950/20">
              <span className="text-muted-foreground">{t('donate.summary.amount')}:</span>
              <span className="font-bold text-rose-700 dark:text-rose-400">{formattedAmount}</span>
            </div>
          )}
        </section>

        <Separator />

        {/* Donor data */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="d-name">{t('donate.name')} *</Label>
            <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t('donate.name')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="d-email">{t('donate.email')} *</Label>
            <Input id="d-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} placeholder="email@exemplo.com" />
            <p className="text-xs text-muted-foreground">{t('donate.email.hint')}</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="d-whats">{t('donate.whatsapp')}</Label>
            <Input id="d-whats" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={40} placeholder="+351 912 345 678" />
          </div>
          {/* CPF only required for pix_automatic (PixGo) */}
          {cpfRequired && (
            <div className="grid gap-1.5">
              <Label htmlFor="d-cpf">{t('donate.cpf')} *</Label>
              <Input id="d-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={18} placeholder="000.000.000-00" />
            </div>
          )}
        </section>

        <Separator />

        {/* Payment method (filtered by selected currency) */}
        <section>
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('donate.method')}
          </Label>
          {availableMethods.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{t('donate.method.none')}</p>
                <p className="mt-0.5 text-xs">{t('donate.method.none.hint')}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableMethods.map((m) => {
                const Icon = METHOD_ICONS[m.key] ?? CreditCard
                const label = translate(locale, `method.${m.key}`)
                const desc = translate(locale, `method.${m.key}.desc`)
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPaymentMethod(m.key)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 ${
                      paymentMethod === m.key
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/20'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      paymentMethod === m.key ? 'bg-rose-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{label}</span>
                        {m.key === 'pix_manual' && <Badge variant="secondary" className="px-1.5 text-[10px]">Manual</Badge>}
                        {m.key === 'bank_transfer' && <Badge variant="secondary" className="px-1.5 text-[10px]">SEPA</Badge>}
                        {m.key === 'pix_automatic' && <Badge variant="secondary" className="px-1.5 text-[10px]">Auto</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{desc}</p>
                    </div>
                    {paymentMethod === m.key && <Check className="h-4 w-4 shrink-0 text-rose-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <Separator />

        {/* Pack Media (optional) */}
        <section>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10">
            <Checkbox
              checked={wantPackMedia}
              onCheckedChange={(v) => setWantPackMedia(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold">{t('donate.pack')}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('donate.pack.hint')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('donate.pack.note')}</p>
            </div>
          </label>
        </section>

        <Separator />

        {/* Message (optional) */}
        <section className="grid gap-1.5">
          <Label htmlFor="d-msg" className="text-xs text-muted-foreground">Mensagem (opcional)</Label>
          <Textarea
            id="d-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Deixe uma palavra de apoio…"
          />
        </section>

        <Separator />

        {/* Summary + Submit */}
        <section>
          <div className="mb-4 rounded-xl border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <SummaryRow label={t('donate.summary.amount')} value={formattedAmount} />
              <SummaryRow label={t('donate.summary.method')} value={paymentMethod ? translate(locale, `method.${paymentMethod}`) : '—'} />
              <SummaryRow label={t('donate.summary.pack')} value={wantPackMedia ? t('donate.yes') : t('donate.no')} />
            </div>
          </div>
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('donate.confirm.security')}</span>
          </div>
          <Button onClick={submit} disabled={!canSubmit || submitting} className="w-full gap-2 sm:w-auto" size="lg">
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t('donate.submitting')}</>
            ) : (
              <>{t('donate.submit')} <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </section>
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/**
 * PixGo inline result — shows the generated QR code (base64 PNG) and/or the
 * "Copia e Cola" text. Payment confirmation happens automatically via the
 * PixGo webhook; the donor just needs to scan and pay.
 */
function PixGoPaymentResult({
  result, campaignName, t,
}: {
  result: PixGoResult
  campaignName: string
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [copied, setCopied] = useState(false)

  const copyCopiaCola = async () => {
    if (!result.qrCode) return
    try {
      await navigator.clipboard.writeText(result.qrCode)
      setCopied(true)
      toast.success(`${t('iban.copy')} ✓`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  const expiresAtLabel = useMemo(() => {
    if (!result.expiresAt) return null
    try {
      return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(result.expiresAt))
    } catch {
      return null
    }
  }, [result.expiresAt])

  return (
    <Card className="border-emerald-200 dark:border-emerald-900">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <QrCode className="h-8 w-8 text-emerald-600" />
        </div>
        <CardTitle className="text-xl">{t('pix.title')}</CardTitle>
        <CardDescription>
          {campaignName} — {t('pixgo.waiting')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* QR Code image (base64 PNG) */}
        {result.qrCodeImage && (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
            <img
              src={`data:image/png;base64,${result.qrCodeImage}`}
              alt="QR Code PIX"
              className="h-64 w-64 rounded-lg border bg-white p-2"
            />
            <p className="text-center text-xs text-muted-foreground">{t('pix.instructions')}</p>
          </div>
        )}

        {/* Copia e Cola text + copy button */}
        {result.qrCode && (
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('pix.copiaecola')}
            </Label>
            <div className="flex items-stretch gap-2">
              <Input
                readOnly
                value={result.qrCode}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button variant="outline" size="sm" onClick={copyCopiaCola} className="shrink-0 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {t('iban.copy')}
              </Button>
            </div>
          </div>
        )}

        {/* No QR — show fallback notice */}
        {!result.qrCodeImage && !result.qrCode && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{t('pix.waiting')}</p>
          </div>
        )}

        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mb-1 h-3.5 w-3.5" /> {t('pixgo.waiting')}
        </div>

        <Separator />

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>{t('result.reference')}: <code className="font-mono text-foreground">{result.reference.slice(0, 12)}</code></p>
          {expiresAtLabel && (
            <p className="mt-1">Expira em: <span className="text-foreground">{expiresAtLabel}</span></p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ManualPaymentResult({
  result, methods, campaignName, locale, t,
}: {
  result: { id: string; paymentMethod: string; status: string }
  methods: PaymentMethodsResponse | null
  campaignName: string
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const bank = methods?.methods.bank_transfer
  const pix = methods?.methods.pix_manual

  const copy = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      toast.success(`${t('iban.copy')} ✓`)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-900">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <CardTitle className="text-xl">{t('result.title')}</CardTitle>
        <CardDescription>
          {campaignName} — {t('result.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* PIX Manual */}
        {result.paymentMethod === 'pix_manual' && pix?.available && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <QrCode className="h-4 w-4 text-rose-600" /> {t('pix.title')}
            </h3>
            {pix.beneficiaryName && (
              <p className="text-sm text-muted-foreground">
                {t('pix.beneficiary')}: <span className="font-medium text-foreground">{pix.beneficiaryName}</span>
              </p>
            )}
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <img
                src="/api/public/pix-qr"
                alt="QR Code PIX"
                className="h-48 w-48 rounded-lg border bg-white p-2"
                loading="lazy"
              />
              <p className="text-center text-xs text-muted-foreground">{t('pix.instructions')}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mb-1 h-3.5 w-3.5" /> {t('pix.waiting')}
            </div>
          </div>
        )}

        {/* IBAN / Bank Transfer */}
        {result.paymentMethod === 'bank_transfer' && bank?.available && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="h-4 w-4 text-rose-600" /> {t('iban.title')}
            </h3>
            {bank.holder && (
              <CopyRow label={t('iban.holder')} value={bank.holder} onCopy={() => copy('holder', bank.holder!)} copied={copiedField === 'holder'} t={t} />
            )}
            {bank.bank && (
              <CopyRow label={t('iban.bank')} value={bank.bank} onCopy={() => copy('bank', bank.bank!)} copied={copiedField === 'bank'} t={t} />
            )}
            {bank.iban && (
              <CopyRow label={t('iban.iban')} value={bank.iban} mono onCopy={() => copy('iban', bank.iban!)} copied={copiedField === 'iban'} t={t} />
            )}
            {bank.bic && (
              <CopyRow label={t('iban.bic')} value={bank.bic} mono onCopy={() => copy('bic', bank.bic!)} copied={copiedField === 'bic'} t={t} />
            )}
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mb-1 h-3.5 w-3.5" /> {t('iban.instructions')}
            </div>
          </div>
        )}

        <Separator />

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>{t('result.reference')}: <code className="font-mono text-foreground">{result.id.slice(0, 12)}</code></p>
          <p className="mt-1">{t('result.waiting')}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function CopyRow({
  label, value, mono, onCopy, copied, t,
}: {
  label: string
  value: string
  mono?: boolean
  onCopy: () => void
  copied: boolean
  t: (key: string) => string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-2.5">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="sr-only">{t('iban.copy')}</span>
      </Button>
    </div>
  )
}
