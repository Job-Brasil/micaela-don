'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Heart,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  ImageOff,
  ExternalLink,
  Lock,
  Mail,
  QrCode,
  Landmark,
  Users,
  Image as ImageIcon,
  Video,
  FileText,
  Shapes,
  Music,
  Folder,
  MessageCircle,
  ArrowRight,
  Quote,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { PublicSite } from '@/lib/public-data'
import { AdminApp } from '@/components/admin-app'
import { DonationFlow } from '@/components/donation-flow'

/* ----------------------------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------------------------- */

const CATEGORY_LABEL: Record<string, string> = {
  foto: 'Foto',
  video: 'Vídeo',
  documento: 'Documento',
  logo: 'Logótipo',
  audio: 'Áudio',
  outro: 'Outro',
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  foto: ImageIcon,
  video: Video,
  documento: FileText,
  logo: Shapes,
  audio: Music,
  outro: Folder,
}

const CATEGORY_ACCENT: Record<string, string> = {
  foto: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
  video: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  documento: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-200',
  logo: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200',
  audio: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
  outro: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-200',
}

type ConsentChoice = 'none' | 'email' | 'whatsapp' | 'both'

const CONSENT_OPTIONS: { value: ConsentChoice; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'Não pretendo receber agradecimento',
    description: 'O donativo será registado de forma anónima, sem contacto de retorno.',
  },
  {
    value: 'email',
    label: 'Por e-mail',
    description: 'Recebo um agradecimento por e-mail.',
  },
  {
    value: 'whatsapp',
    label: 'Por WhatsApp',
    description: 'Recebo um agradecimento por WhatsApp.',
  },
  {
    value: 'both',
    label: 'E-mail e WhatsApp',
    description: 'Recebo um agradecimento por ambos os canais.',
  },
]

const channelsFor = (c: ConsentChoice): string[] => {
  switch (c) {
    case 'email':
      return ['email']
    case 'whatsapp':
      return ['whatsapp']
    case 'both':
      return ['email', 'whatsapp']
    default:
      return []
  }
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const isValidWhatsapp = (v: string) => /^\+\d{8,15}$/.test(v.replace(/[\s\-()]/g, ''))

/* ----------------------------------------------------------------------------
 * Top-level component
 * ------------------------------------------------------------------------- */

export function PublicSite({ initial }: { initial: PublicSite }) {
  const s = initial.settings
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header onAdmin={() => setAdminOpen(true)} />

      <main className="flex-1">
        <Hero
          layout={initial.hero.layout}
          bannerImage={initial.hero.bannerImage}
          bannerAlt={initial.hero.bannerAlt}
          portraitImage={initial.hero.portraitImage}
          portraitAlt={initial.hero.portraitAlt}
          eyebrow={s['hero.eyebrow'] ?? ''}
          title={s['hero.title'] ?? 'Um Gesto de Apoio'}
          subtitle={s['hero.subtitle'] ?? ''}
          ctaPrimary={s['hero.ctaPrimary'] ?? 'Apoiar agora'}
          ctaSecondary={s['hero.ctaSecondary'] ?? 'Conhecer a história'}
        />

        <StorySection
          title={s['story.title'] ?? 'A história'}
          body={s['story.body'] ?? ''}
          storyImage={initial.hero.storyImage}
          storyAlt={initial.hero.storyAlt}
          layout={initial.hero.layout}
        />

        <DonateSection
          title={s['donate.title'] ?? 'Como apoiar'}
          note={s['donate.note'] ?? ''}
          payment={initial.payment}
          paymentStatus={initial.paymentStatus}
          pix={initial.pix}
          campaignId={initial.campaign?.id ?? 'micaela'}
          campaignName={initial.campaign?.name ?? 'A história da Micaela'}
        />

        <MaterialsSection title={s['materials.title'] ?? 'Materiais'} materials={initial.materials} />
      </main>

      <Footer
        note={s['footer.note'] ?? 'Um Gesto de Apoio'}
        contactChannels={initial.contactChannels}
        onAdmin={() => setAdminOpen(true)}
      />

      {adminOpen && <AdminApp onClose={() => setAdminOpen(false)} />}
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Header
 * ------------------------------------------------------------------------- */

function Header({ onAdmin }: { onAdmin: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-background/85 backdrop-blur-md dark:border-stone-800/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <a href="#topo" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm ring-1 ring-rose-700/20 transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105">
            <Heart className="h-4 w-4" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-base font-semibold tracking-tight sm:text-lg">
              Um Gesto de Apoio
            </span>
            <span className="mt-0.5 hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Campanha de solidariedade
            </span>
          </span>
        </a>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden text-foreground/80 sm:inline-flex">
            <a href="#historia">História</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden text-foreground/80 sm:inline-flex">
            <a href="#materiais">Materiais</a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 rounded-full">
            <a href="#apoiar">
              <Heart className="h-4 w-4" /> Apoiar
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdmin}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Área de administração"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        </nav>
      </div>
    </header>
  )
}

/* ----------------------------------------------------------------------------
 * Hero — supports 4 layouts (none | banner | portrait | story-inline)
 * ------------------------------------------------------------------------- */

type HeroProps = {
  layout: string
  bannerImage: string | null
  bannerAlt: string | null
  portraitImage: string | null
  portraitAlt: string | null
  eyebrow: string
  title: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
}

function Hero(props: HeroProps) {
  const {
    layout,
    bannerImage,
    bannerAlt,
    portraitImage,
    portraitAlt,
    eyebrow,
    title,
    subtitle,
    ctaPrimary,
    ctaSecondary,
  } = props

  // Banner layout — full-bleed image with overlay + text on top.
  if (layout === 'banner' && bannerImage) {
    return (
      <section id="topo" className="relative isolate overflow-hidden border-b border-stone-200/70 dark:border-stone-800/70">
        <img
          src={bannerImage}
          alt={bannerAlt ?? title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/35 to-stone-950/55"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-32">
          {eyebrow && (
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm ring-1 ring-white/25">
              <Heart className="h-3 w-3" /> {eyebrow}
            </span>
          )}
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-5xl md:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-100/95 sm:text-lg">
              {subtitle}
            </p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <a href="#apoiar">
                <Heart className="mr-1 h-4 w-4" /> {ctaPrimary}
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <a href="#historia">{ctaSecondary}</a>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // Portrait layout — split text/image.
  if (layout === 'portrait' && portraitImage) {
    return (
      <section
        id="topo"
        className="relative overflow-hidden border-b border-stone-200/70 bg-gradient-to-b from-rose-50 via-background to-background dark:border-stone-800/70 dark:from-rose-950/20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl dark:bg-rose-900/20"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:gap-14 md:py-24">
          <div className="order-2 md:order-1">
            <HeroText eyebrow={eyebrow} title={title} subtitle={subtitle} ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
          </div>
          <div className="order-1 md:order-2">
            <div className="relative mx-auto max-w-sm md:max-w-none">
              <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-rose-200/60 to-amber-100/40 dark:from-rose-900/30 dark:to-amber-900/10" />
              <div className="overflow-hidden rounded-[1.5rem] border border-stone-200/80 bg-card shadow-md dark:border-stone-800/80">
                <img
                  src={portraitImage}
                  alt={portraitAlt ?? title}
                  className="aspect-[4/5] w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Default (none / story-inline / fallbacks without image) — text-only hero.
  return (
    <section
      id="topo"
      className="relative overflow-hidden border-b border-stone-200/70 bg-gradient-to-b from-rose-50 via-background to-background dark:border-stone-800/70 dark:from-rose-950/20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl dark:bg-rose-900/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-900/10"
      />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 md:py-28">
        <HeroText
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          ctaPrimary={ctaPrimary}
          ctaSecondary={ctaSecondary}
          centered
        />
      </div>
    </section>
  )
}

function HeroText({
  eyebrow,
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  centered,
}: {
  eyebrow: string
  title: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
  centered?: boolean
}) {
  return (
    <>
      {eyebrow && (
        <span
          className={`mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/40 ${
            centered ? 'mx-auto' : ''
          }`}
        >
          <Heart className="h-3 w-3" /> {eyebrow}
        </span>
      )}
      <h1
        className={`font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl ${
          centered ? 'mx-auto max-w-3xl' : 'max-w-3xl'
        }`}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={`mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg ${
            centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'
          }`}
        >
          {subtitle}
        </p>
      )}
      <div className={`mt-8 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
        <Button asChild size="lg" className="rounded-full">
          <a href="#apoiar">
            <Heart className="mr-1 h-4 w-4" /> {ctaPrimary}
          </a>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <a href="#historia">
            {ctaSecondary} <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </div>
      <div
        className={`mt-8 flex items-center gap-2 text-xs text-muted-foreground ${
          centered ? 'justify-center' : ''
        }`}
      >
        <ShieldCheck className="h-4 w-4 text-rose-600" />
        Dados verificados administrativamente · Confirmação manual de donativos
      </div>
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Story section — with optional inline image (when layout === 'story-inline')
 * ------------------------------------------------------------------------- */

function StorySection({
  title,
  body,
  storyImage,
  storyAlt,
  layout,
}: {
  title: string
  body: string
  storyImage: string | null
  storyAlt: string | null
  layout: string
}) {
  const hasImage = !!storyImage && layout === 'story-inline'
  return (
    <section id="historia" className="border-b border-stone-200/70 dark:border-stone-800/70">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionLabel index="01" label="A história" />
        {hasImage ? (
          <div className="mt-8 grid items-start gap-10 md:grid-cols-[1fr_1.4fr] md:gap-14">
            <div className="md:sticky md:top-28">
              <div className="relative mx-auto max-w-sm md:max-w-none">
                <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-rose-200/50 to-amber-100/40 dark:from-rose-900/25 dark:to-amber-900/10" />
                <div className="overflow-hidden rounded-[1.5rem] border border-stone-200/80 bg-card shadow-md dark:border-stone-800/80">
                  <img
                    src={storyImage!}
                    alt={storyAlt ?? title}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover object-center"
                  />
                </div>
              </div>
            </div>
            <div>
              <Quote className="h-8 w-8 text-rose-300 dark:text-rose-800" />
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h2>
              <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:text-lg">
                {body}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-3xl">
            <Quote className="h-8 w-8 text-rose-300 dark:text-rose-800" />
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:text-lg">
              {body}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------------------
 * Donate section — EUR/PIX tabs + donation intent form
 * ------------------------------------------------------------------------- */

function DonateSection({
  title,
  note,
  payment,
  paymentStatus,
  pix,
  campaignId,
  campaignName,
}: {
  title: string
  note: string
  payment: PublicSite['payment']
  paymentStatus: PublicSite['paymentStatus']
  pix: PublicSite['pix']
  campaignId: string
  campaignName: string
}) {
  return (
    <section
      id="apoiar"
      className="border-b border-stone-200/70 bg-gradient-to-b from-background to-rose-50/40 dark:border-stone-800/70 dark:to-rose-950/10"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionLabel index="02" label="Como apoiar" />
        <div className="mt-8 max-w-2xl">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          {note && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-rose-600" /> {note}
            </p>
          )}
        </div>

        <Tabs defaultValue="eur" className="mt-10 w-full">
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-xl bg-muted p-1">
            <TabsTrigger value="eur" className="gap-1.5 rounded-lg py-2">
              <Landmark className="h-4 w-4" /> EUR
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-1.5 rounded-lg py-2">
              <QrCode className="h-4 w-4" /> PIX (BRL)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eur" className="mt-6">
            <EurCard payment={payment} paymentStatus={paymentStatus} />
          </TabsContent>
          <TabsContent value="pix" className="mt-6">
            <PixCard pix={pix} />
          </TabsContent>
        </Tabs>

        <Separator className="my-12" />
        <DonationFlow campaignId={campaignId} campaignName={campaignName} />
      </div>
    </section>
  )
}

function EurCard({
  payment,
  paymentStatus,
}: {
  payment: PublicSite['payment']
  paymentStatus: PublicSite['paymentStatus']
}) {
  if (!payment) {
    const inReview = paymentStatus.exists && (!paymentStatus.approved || !paymentStatus.published)
    return (
      <Card className="overflow-hidden rounded-2xl border-stone-200/80 shadow-sm dark:border-stone-800/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="font-serif text-lg">Transferência bancária (EUR)</CardTitle>
              <CardDescription className="mt-0.5">
                {inReview
                  ? 'Dados bancários em verificação administrativa. Disponíveis em breve.'
                  : 'Dados bancários ainda não configurados.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden rounded-2xl border-stone-200/80 shadow-sm transition-shadow motion-safe:duration-200 hover:shadow-md dark:border-stone-800/80">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            <Landmark className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="font-serif text-lg">Transferência bancária (EUR)</CardTitle>
            {payment.method && <CardDescription className="mt-0.5">{payment.method}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CopyRow label="Titular" value={payment.holder} />
        <CopyRow label="Banco" value={payment.bank} />
        <CopyRow label="IBAN" value={payment.iban} mono />
        {payment.bic && <CopyRow label="BIC/SWIFT" value={payment.bic} mono />}
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Dados verificados e publicados pela administração. A confirmação do donativo é
            administrativa.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copiado`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }
  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-card p-3 transition-colors motion-safe:duration-200 hover:border-stone-300 dark:border-stone-800/80 dark:hover:border-stone-700">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0 rounded-lg">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">Copiar {label}</span>
      </Button>
    </div>
  )
}

function PixCard({ pix }: { pix: PublicSite['pix'] }) {
  if (!pix.available) {
    return (
      <Card className="overflow-hidden rounded-2xl border-stone-200/80 shadow-sm dark:border-stone-800/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <ImageOff className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="font-serif text-lg">PIX (BRL)</CardTitle>
              <CardDescription className="mt-0.5">
                O QR Code PIX está em verificação administrativa e será publicado assim que for
                confirmado que é legível e corresponde ao destinatário correto.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden rounded-2xl border-stone-200/80 shadow-sm transition-shadow motion-safe:duration-200 hover:shadow-md dark:border-stone-800/80">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            <QrCode className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="font-serif text-lg">PIX (BRL)</CardTitle>
            {pix.beneficiaryName && (
              <CardDescription className="mt-0.5">{pix.beneficiaryName}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm dark:border-stone-800/80">
          <img
            src={pix.qrUrl ?? ''}
            alt="QR Code PIX"
            className="h-56 w-56 rounded-lg"
          />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>QR verificado e publicado pela administração.</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Donation intent form — multi-channel consent
 * ------------------------------------------------------------------------- */

function DonationForm({ campaignId }: { campaignId: string }) {
  const [currency, setCurrency] = useState<'EUR' | 'BRL'>('EUR')
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState<ConsentChoice>('none')
  const [loading, setLoading] = useState(false)

  const needsEmail = consent === 'email' || consent === 'both'
  const needsWhatsapp = consent === 'whatsapp' || consent === 'both'

  const consentSentence = useMemo(() => {
    switch (consent) {
      case 'email':
        return 'Consinto em receber um agradecimento por e-mail. Posso retirar este consentimento a qualquer momento.'
      case 'whatsapp':
        return 'Consinto em receber um agradecimento por WhatsApp. Posso retirar este consentimento a qualquer momento.'
      case 'both':
        return 'Consinto em receber um agradecimento por e-mail e WhatsApp. Posso retirar este consentimento a qualquer momento.'
      default:
        return 'Não pretendo receber um agradecimento. O donativo é registado sem contacto de retorno.'
    }
  }, [consent])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation aligned with server contract.
    if (needsEmail && !isValidEmail(email)) {
      toast.error('Indique um e-mail válido para receber o agradecimento.')
      return
    }
    if (needsWhatsapp && !isValidWhatsapp(whatsapp)) {
      toast.error('Indique um número WhatsApp válido com indicativo internacional (ex: +351 912 345 678).')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/public/donation-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          currency,
          amount: amount ? Number(amount) : undefined,
          donorName: name || undefined,
          donorEmail: needsEmail ? email.trim() : undefined,
          donorWhatsapp: needsWhatsapp ? whatsapp.trim() : undefined,
          message: message || undefined,
          consentChannels: channelsFor(consent),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Erro')
      toast.success('Intenção registada', {
        description: 'A confirmação é administrativa. Este formulário não comprova pagamento.',
      })
      setAmount('')
      setName('')
      setEmail('')
      setWhatsapp('')
      setMessage('')
      setConsent('none')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao submeter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-stone-200/80 shadow-sm dark:border-stone-800/80">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Registar intenção de donativo</CardTitle>
        <CardDescription>
          Indique os dados para registo. A confirmação é administrativa — submeter não comprova
          pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="currency">Moeda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'BRL')}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR — Transferência</SelectItem>
                <SelectItem value="BRL">BRL — PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor (opcional)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={currency === 'EUR' ? 'ex: 25.00' : 'ex: 50.00'}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Como prefere ser tratado(a)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message-short">Mensagem (opcional)</Label>
            <Input
              id="message-short"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              placeholder="Palavras de apoio (uma linha)"
            />
          </div>

          {/* Multi-channel consent */}
          <div className="grid gap-3 sm:col-span-2">
            <Label className="text-sm font-medium">Agradecimento</Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Pode indicar como gostaria de receber um agradecimento. A escolha fica registada como
              consentimento explícito e pode ser retirada a qualquer momento.
            </p>
            <RadioGroup
              value={consent}
              onValueChange={(v) => setConsent(v as ConsentChoice)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {CONSENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`consent-${opt.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200/80 bg-card p-3 transition-colors motion-safe:duration-200 hover:border-stone-300 has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/60 dark:border-stone-800/80 dark:hover:border-stone-700 dark:has-[:checked]:border-rose-700 dark:has-[:checked]:bg-rose-950/20"
                >
                  <RadioGroupItem
                    id={`consent-${opt.value}`}
                    value={opt.value}
                    className="mt-0.5 data-[state=checked]:border-rose-600 data-[state=checked]:text-rose-600"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{opt.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {needsEmail && (
              <div className="grid gap-2 sm:max-w-md">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={160}
                  placeholder="o.seu@email.com"
                  autoComplete="email"
                />
              </div>
            )}
            {needsWhatsapp && (
              <div className="grid gap-2 sm:max-w-md">
                <Label htmlFor="whatsapp">Número WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  maxLength={40}
                  placeholder="+351 912 345 678"
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Inclua o indicativo internacional (ex: +351 para Portugal, +55 para Brasil).
                </p>
              </div>
            )}

            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              {consentSentence}
            </p>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="w-full rounded-full sm:w-auto">
              {loading ? 'A enviar…' : 'Registar intenção'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Materials section
 * ------------------------------------------------------------------------- */

function MaterialsSection({
  title,
  materials,
}: {
  title: string
  materials: PublicSite['materials']
}) {
  return (
    <section id="materiais" className="border-b border-stone-200/70 dark:border-stone-800/70">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionLabel index="03" label="Materiais" />
        <div className="mt-8 flex items-center gap-2">
          <Users className="h-5 w-5 text-rose-600" />
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        </div>
        {materials.length === 0 ? (
          <p className="mt-6 max-w-xl rounded-xl border border-dashed border-stone-300 bg-muted/30 p-6 text-sm text-muted-foreground dark:border-stone-700">
            Em breve serão divulgados os materiais aprovados pela campanha.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MaterialCard({ material: m }: { material: PublicSite['materials'][number] }) {
  const CategoryIcon = CATEGORY_ICON[m.category] ?? Folder
  const label = CATEGORY_LABEL[m.category] ?? m.category
  const accent = CATEGORY_ACCENT[m.category] ?? CATEGORY_ACCENT.outro

  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border-stone-200/80 shadow-sm transition-all motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800/80">
      {/* Cover / fallback */}
      {m.coverImage ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <img
            src={m.coverImage}
            alt={m.coverAlt ?? m.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
          />
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${accent} backdrop-blur-sm`}
          >
            <CategoryIcon className="h-3 w-3" /> {label}
          </span>
        </div>
      ) : (
        <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-950">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}>
            <CategoryIcon className="h-6 w-6" />
          </span>
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${accent}`}
          >
            <CategoryIcon className="h-3 w-3" /> {label}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="rounded-full font-normal">
            {m.type}
          </Badge>
        </div>
        <h3 className="mt-2 font-serif text-lg font-semibold leading-snug tracking-tight">
          {m.name}
        </h3>
        {m.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {m.description}
          </p>
        )}
        <div className="mt-4 flex-1" />
        <Button asChild variant="outline" size="sm" className="w-full rounded-full">
          <a href={m.url} target="_blank" rel="noopener noreferrer">
            Abrir <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Footer
 * ------------------------------------------------------------------------- */

function Footer({
  note,
  contactChannels,
  onAdmin,
}: {
  note: string
  contactChannels: PublicSite['contactChannels']
  onAdmin: () => void
}) {
  const whatsapps = contactChannels.filter((c) => c.type === 'whatsapp')
  const emails = contactChannels.filter((c) => c.type === 'email')

  return (
    <footer className="mt-auto border-t border-stone-200/70 bg-muted/40 dark:border-stone-800/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm">
              <Heart className="h-3.5 w-3.5" />
            </span>
            <span className="font-serif text-base font-semibold tracking-tight">{note}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {whatsapps.map((c) => (
              <Button asChild key={`wa-${c.value}`} variant="outline" size="sm" className="rounded-full">
                <a href={c.value} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> {c.label}
                </a>
              </Button>
            ))}
            {emails.map((c) => (
              <Button asChild key={`em-${c.value}`} variant="outline" size="sm" className="rounded-full">
                <a href={`mailto:${c.value}`}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> {c.label}
                </a>
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={onAdmin}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Admin
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} · Um Gesto de Apoio. Campanha de solidariedade. A confirmação
            de donativos é administrativa.
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
            Dados verificados administrativamente
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ----------------------------------------------------------------------------
 * Shared section label (editorial numbering)
 * ------------------------------------------------------------------------- */

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
      <span className="font-mono text-rose-600">{index}</span>
      <span className="h-px w-8 bg-stone-300 dark:bg-stone-700" />
      <span className="font-medium">{label}</span>
    </div>
  )
}
