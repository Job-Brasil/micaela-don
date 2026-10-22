'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { PublicSite } from '@/lib/public-data'
import { AdminApp } from '@/components/admin-app'

const CATEGORY_LABEL: Record<string, string> = {
  foto: 'Foto',
  video: 'Vídeo',
  documento: 'Documento',
  logo: 'Logótipo',
  audio: 'Áudio',
  outro: 'Outro',
}

export function PublicSite({ initial }: { initial: PublicSite }) {
  const s = initial.settings
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header onAdmin={() => setAdminOpen(true)} />

      <main className="flex-1">
        <Hero
          eyebrow={s['hero.eyebrow'] ?? ''}
          title={s['hero.title'] ?? 'Um Gesto de Apoio'}
          subtitle={s['hero.subtitle'] ?? ''}
        />

        <StorySection
          title={s['story.title'] ?? 'A história'}
          body={s['story.body'] ?? ''}
        />

        <DonateSection
          title={s['donate.title'] ?? 'Como apoiar'}
          note={s['donate.note'] ?? ''}
          payment={initial.payment}
          paymentStatus={initial.paymentStatus}
          pix={initial.pix}
        />

        <MaterialsSection
          title={s['materials.title'] ?? 'Materiais'}
          materials={initial.materials}
        />
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

function Header({ onAdmin }: { onAdmin: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white">
            <Heart className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">Um Gesto de Apoio</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href="#apoiar">Apoiar</a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdmin}
            className="text-muted-foreground"
            aria-label="Área de administração"
          >
            <Lock className="mr-1 h-3.5 w-3.5" />
            Admin
          </Button>
        </nav>
      </div>
    </header>
  )
}

function Hero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-50 via-background to-background dark:from-rose-950/20"
      />
      <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <Badge variant="secondary" className="mb-4 gap-1">
          <Heart className="h-3 w-3 text-rose-600" /> {eyebrow}
        </Badge>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{subtitle}</p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href="#apoiar">
              <Heart className="mr-1 h-4 w-4" /> Apoiar agora
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="#historia">Conhecer a história</a>
          </Button>
        </div>
        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Dados de pagamento verificados administrativamente · Confirmação manual de donativos
        </div>
      </div>
    </section>
  )
}

function StorySection({ title, body }: { title: string; body: string }) {
  return (
    <section id="historia" className="border-b">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </section>
  )
}

function DonateSection({
  title,
  note,
  payment,
  paymentStatus,
  pix,
}: {
  title: string
  note: string
  payment: PublicSite['payment']
  paymentStatus: PublicSite['paymentStatus']
  pix: PublicSite['pix']
}) {
  return (
    <section id="apoiar" className="border-b bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {note}
          </p>
        </div>

        <Tabs defaultValue="eur" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="eur" className="gap-1">
              <Landmark className="h-4 w-4" /> EUR
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-1">
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

        <Separator className="my-8" />
        <DonationForm />
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-amber-600" /> Transferência bancária (EUR)
          </CardTitle>
          <CardDescription>
            {inReview
              ? 'Dados bancários em verificação administrativa. Disponíveis em breve.'
              : 'Dados bancários ainda não configurados.'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5" /> Transferência bancária (EUR)
        </CardTitle>
        <CardDescription>{payment.method}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CopyRow label="Titular" value={payment.holder} />
        <CopyRow label="Banco" value={payment.bank} />
        <CopyRow label="IBAN" value={payment.iban} mono />
        {payment.bic && <CopyRow label="BIC/SWIFT" value={payment.bic} mono />}
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Dados verificados e publicados pela administração. A confirmação do donativo é
          administrativa.
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
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="sr-only">Copiar {label}</span>
      </Button>
    </div>
  )
}

function PixCard({ pix }: { pix: PublicSite['pix'] }) {
  if (!pix.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageOff className="h-5 w-5 text-amber-600" /> PIX (BRL)
          </CardTitle>
          <CardDescription>
            O QR Code PIX está em verificação administrativa e será publicado assim que for
            confirmado que é legível e corresponde ao destinatário correto.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5" /> PIX (BRL)
        </CardTitle>
        {pix.beneficiaryName && <CardDescription>{pix.beneficiaryName}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <img
          src={pix.qrUrl ?? ''}
          alt="QR Code PIX"
          className="h-56 w-56 rounded-lg border bg-white p-2"
        />
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          QR verificado e publicado pela administração.
        </div>
      </CardContent>
    </Card>
  )
}

function DonationForm() {
  const [currency, setCurrency] = useState<'EUR' | 'BRL'>('EUR')
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/public/donation-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          amount: amount ? Number(amount) : undefined,
          donorName: name || undefined,
          donorEmail: email || undefined,
          message: message || undefined,
          consentEmail: consent && !!email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Erro')
      toast.success('Intenção registada', {
        description:
          'A confirmação é administrativa. Este formulário não comprova pagamento.',
      })
      setAmount('')
      setName('')
      setEmail('')
      setMessage('')
      setConsent(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao submeter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Registar intenção de donativo</CardTitle>
        <CardDescription>
          Indique os dados para registo. A confirmação é administrativa — submeter não comprova
          pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
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
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={160}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
            <span className="text-muted-foreground">
              Quero receber um agradecimento por e-mail (consentimento registado).
            </span>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'A enviar…' : 'Registar intenção'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function MaterialsSection({
  title,
  materials,
}: {
  title: string
  materials: PublicSite['materials']
}) {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-rose-600" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        </div>
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Em breve serão divulgados os materiais aprovados pela campanha.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{CATEGORY_LABEL[m.category] ?? m.category}</Badge>
                    <span className="text-xs text-muted-foreground">{m.type}</span>
                  </div>
                  <CardTitle className="mt-2 text-base">{m.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      Abrir <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Footer({
  note,
  contactChannels,
  onAdmin,
}: {
  note: string
  contactChannels: PublicSite['contactChannels']
  onAdmin: () => void
}) {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white">
              <Heart className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-medium">{note}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {contactChannels
              .filter((c) => c.type === 'whatsapp')
              .map((c) => (
                <Button asChild key={c.value} variant="outline" size="sm">
                  <a href={c.value} target="_blank" rel="noopener noreferrer">
                    {c.label}
                  </a>
                </Button>
              ))}
            {contactChannels
              .filter((c) => c.type === 'email')
              .map((c) => (
                <Button asChild key={c.value} variant="outline" size="sm">
                  <a href={`mailto:${c.value}`}>
                    <Mail className="mr-1 h-3.5 w-3.5" /> {c.label}
                  </a>
                </Button>
              ))}
            <Button variant="ghost" size="sm" onClick={onAdmin} className="text-muted-foreground">
              <Lock className="mr-1 h-3.5 w-3.5" /> Admin
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} · Um Gesto de Apoio. Campanha de solidariedade. A confirmação
          de donativos é administrativa.
        </p>
      </div>
    </footer>
  )
}
