'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  X,
  LogOut,
  LayoutDashboard,
  Landmark,
  QrCode,
  FolderKanban,
  HandCoins,
  MessageSquareHeart,
  Mail,
  ScrollText,
  Upload,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/admin-client'

type Tab = 'site' | 'payment' | 'pix' | 'materials' | 'donations' | 'templates' | 'channels' | 'audit'

export function AdminApp({ onClose }: { onClose: () => void }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('site')

  useEffect(() => {
    let active = true
    apiFetch<{ authenticated: boolean }>('/api/admin/session')
      .then((r) => active && setAuthed(r.authenticated))
      .catch(() => active && setAuthed(false))
    return () => {
      active = false
    }
  }, [])

  const logout = async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    setAuthed(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-rose-600" />
          <span className="text-sm font-semibold">Painel de Administração</span>
        </div>
        <div className="flex items-center gap-2">
          {authed && (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {authed === null ? (
          <div className="flex h-full items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A verificar sessão…
          </div>
        ) : !authed ? (
          <LoginView onLoggedIn={() => setAuthed(true)} />
        ) : (
          <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="site" className="gap-1"><LayoutDashboard className="h-3.5 w-3.5" /> Site</TabsTrigger>
                <TabsTrigger value="payment" className="gap-1"><Landmark className="h-3.5 w-3.5" /> EUR</TabsTrigger>
                <TabsTrigger value="pix" className="gap-1"><QrCode className="h-3.5 w-3.5" /> PIX</TabsTrigger>
                <TabsTrigger value="materials" className="gap-1"><FolderKanban className="h-3.5 w-3.5" /> Materiais</TabsTrigger>
                <TabsTrigger value="donations" className="gap-1"><HandCoins className="h-3.5 w-3.5" /> Donativos</TabsTrigger>
                <TabsTrigger value="templates" className="gap-1"><MessageSquareHeart className="h-3.5 w-3.5" /> Modelos</TabsTrigger>
                <TabsTrigger value="channels" className="gap-1"><Mail className="h-3.5 w-3.5" /> Canais</TabsTrigger>
                <TabsTrigger value="audit" className="gap-1"><ScrollText className="h-3.5 w-3.5" /> Auditoria</TabsTrigger>
              </TabsList>

              <TabsContent value="site" className="mt-6"><SiteTab /></TabsContent>
              <TabsContent value="payment" className="mt-6"><PaymentTab /></TabsContent>
              <TabsContent value="pix" className="mt-6"><PixTab /></TabsContent>
              <TabsContent value="materials" className="mt-6"><MaterialsTab /></TabsContent>
              <TabsContent value="donations" className="mt-6"><DonationsTab /></TabsContent>
              <TabsContent value="templates" className="mt-6"><TemplatesTab /></TabsContent>
              <TabsContent value="channels" className="mt-6"><ChannelsTab /></TabsContent>
              <TabsContent value="audit" className="mt-6"><AuditTab /></TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

function LoginView({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      toast.success('Sessão iniciada')
      onLoggedIn()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-rose-600" /> Acesso restrito
          </CardTitle>
          <CardDescription>Área exclusiva para administradores autorizados.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="adm-email">E-mail</Label>
              <Input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adm-pass">Password</Label>
              <Input id="adm-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'A entrar…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- reusable bits ----------
function useAdmin<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<T>(url)
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 p-4 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
    </div>
  )
}

// ---------- Site tab ----------
const SITE_KEYS = [
  'hero.eyebrow',
  'hero.title',
  'hero.subtitle',
  'story.title',
  'story.body',
  'donate.title',
  'donate.note',
  'materials.title',
  'footer.note',
] as const

function SiteTab() {
  const { data, loading, reload } = useAdmin<{ settings: Record<string, string> }>('/api/admin/site')
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.settings) setVals(data.settings)
  }, [data])

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/admin/site', {
        method: 'PUT',
        body: JSON.stringify({ settings: vals }),
      })
      toast.success('Conteúdo guardado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingRow />
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Conteúdo público</CardTitle>
        <CardDescription>Textos editáveis da página. As alterações são imediatas na página pública.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {SITE_KEYS.map((k) => (
          <div key={k} className="grid gap-2">
            <Label htmlFor={`s-${k}`}>{k}</Label>
            {k === 'story.body' || k === 'hero.subtitle' ? (
              <Textarea
                id={`s-${k}`}
                value={vals[k] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
                rows={k === 'story.body' ? 5 : 2}
              />
            ) : (
              <Input
                id={`s-${k}`}
                value={vals[k] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'A guardar…' : 'Guardar conteúdo'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------- Payment (EUR) tab ----------
type PaymentCfg = {
  id: string
  holder: string
  bank: string
  iban: string
  bic: string | null
  method: string
  currency: string
  published: boolean
  approved: boolean
  notes: string | null
}

function PaymentTab() {
  const { data, loading, reload } = useAdmin<{ config: PaymentCfg | null }>('/api/admin/payment-config')
  const cfg = data?.config ?? null
  const [form, setForm] = useState<Partial<PaymentCfg>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cfg) setForm(cfg)
  }, [cfg])

  const save = async (patch: Partial<PaymentCfg> = {}) => {
    setSaving(true)
    try {
      const body = { ...form, ...patch }
      await apiFetch('/api/admin/payment-config', { method: 'PUT', body: JSON.stringify(body) })
      toast.success('Configuração guardada')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingRow />
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5" /> Pagamento EUR (transferência)
        </CardTitle>
        <CardDescription>
          Dados privados. Só são visíveis na página pública quando aprovados e publicados.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Titular</Label><Input value={form.holder ?? ''} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Banco</Label><Input value={form.bank ?? ''} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>IBAN</Label><Input value={form.iban ?? ''} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} className="font-mono" /></div>
          <div className="grid gap-2"><Label>BIC/SWIFT</Label><Input value={form.bic ?? ''} onChange={(e) => setForm((f) => ({ ...f, bic: e.target.value }))} className="font-mono" /></div>
          <div className="grid gap-2"><Label>Método</Label><Input value={form.method ?? ''} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Moeda</Label><Input value={form.currency ?? 'EUR'} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} /></div>
        </div>
        <div className="grid gap-2">
          <Label>Notas internas</Label>
          <Textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
        <Separator />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ToggleLine
              label="Verificado (aprovado)"
              checked={!!form.approved}
              onChange={(v) => save({ approved: v })}
            />
            <ToggleLine
              label="Publicado na página pública"
              checked={!!form.published}
              onChange={(v) => save({ published: v })}
            />
          </div>
          <Button onClick={() => save()} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar dados'}
          </Button>
        </div>
        <StatusRow approved={!!cfg?.approved} published={!!cfg?.published} />
      </CardContent>
    </Card>
  )
}

function ToggleLine({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  )
}

function StatusRow({ approved, published }: { approved: boolean; published: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={approved ? 'default' : 'secondary'}>
        {approved ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
        {approved ? 'Aprovado' : 'Por aprovar'}
      </Badge>
      <Badge variant={published ? 'default' : 'secondary'}>
        {published ? <ShieldCheck className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
        {published ? 'Publicado' : 'Não publicado'}
      </Badge>
    </div>
  )
}

// ---------- PIX tab ----------
type PixCfg = {
  id?: string
  qrPresent: boolean
  qrImageMime?: string | null
  beneficiaryName?: string | null
  approved: boolean
  published: boolean
  notes?: string | null
}

function PixTab() {
  const { data, loading, reload } = useAdmin<{ config: PixCfg | null }>('/api/admin/pix')
  const cfg = data?.config ?? null
  const [beneficiary, setBeneficiary] = useState('')
  const [notes, setNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setBeneficiary(cfg?.beneficiaryName ?? '')
    setNotes(cfg?.notes ?? '')
  }, [cfg])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      await apiFetch('/api/admin/pix', {
        method: 'POST',
        body: JSON.stringify({ qrImage: dataUrl, beneficiaryName: beneficiary, notes }),
      })
      toast.success('QR carregado (pendente de aprovação)')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro no carregamento')
    } finally {
      setUploading(false)
    }
  }

  const save = async (patch: Partial<PixCfg>) => {
    setSaving(true)
    try {
      await apiFetch('/api/admin/pix', {
        method: 'PUT',
        body: JSON.stringify({ beneficiaryName: beneficiary, notes, ...patch }),
      })
      toast.success('PIX atualizado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingRow />
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5" /> PIX (BRL)
        </CardTitle>
        <CardDescription>
          O QR carregado fica privado até ser verificado (legível e correspondente ao destinatário)
          e publicado. Não inventar nem gerar um QR fictício.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Beneficiário</Label><Input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} /></div>
        </div>
        <div className="grid gap-2"><Label>Notas internas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1 h-4 w-4" /> {uploading ? 'A carregar…' : 'Carregar QR Code'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
              e.target.value = ''
            }}
          />
          {cfg?.qrPresent && (
            <img src="/api/admin/pix/preview" alt="Pré-visualização do QR" className="h-24 w-24 rounded border bg-white p-1" />
          )}
        </div>

        {cfg?.qrPresent && (
          <>
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ToggleLine label="Verificado (aprovado)" checked={cfg.approved} onChange={(v) => save({ approved: v })} />
                <ToggleLine label="Publicado" checked={cfg.published} onChange={(v) => save({ published: v })} />
              </div>
            </div>
            <StatusRow approved={cfg.approved} published={cfg.published} />
          </>
        )}
        {!cfg?.qrPresent && (
          <p className="text-sm text-muted-foreground">Nenhum QR carregado. Carregue a imagem fornecida pelo destinatário.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Materials tab ----------
type Material = {
  id: string
  name: string
  category: string
  type: string
  url: string
  source: string
  approved: boolean
  published: boolean
}

function MaterialsTab() {
  const { data, loading, reload } = useAdmin<{ materials: Material[] }>('/api/admin/materials')
  const [form, setForm] = useState({ name: '', category: 'foto', type: '', url: '' })
  const [creating, setCreating] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiFetch('/api/admin/materials', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Material adicionado (pendente de aprovação)')
      setForm({ name: '', category: 'foto', type: '', url: '' })
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setCreating(false)
    }
  }

  const patch = async (m: Material, patch: Partial<Material>) => {
    try {
      await apiFetch(`/api/admin/materials/${m.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      toast.success('Atualizado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const remove = async (m: Material) => {
    if (!confirm(`Eliminar "${m.name}"?`)) return
    try {
      await apiFetch(`/api/admin/materials/${m.id}`, { method: 'DELETE' })
      toast.success('Eliminado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  if (loading) return <LoadingRow />
  const list = data?.materials ?? []
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Adicionar material</CardTitle>
          <CardDescription>Catálogo da pasta da campanha. Criado como pendente de aprovação.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid gap-2"><Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['foto', 'video', 'documento', 'logo', 'audio', 'outro'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Tipo (mime/ext)</Label><Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="image/png" required /></div>
            <div className="grid gap-2"><Label>URL</Label><Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…" required /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={creating}>{creating ? 'A adicionar…' : 'Adicionar material'}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Materiais ({list.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Nome</th><th className="p-3">Categoria</th>
                  <th className="p-3">Estado</th><th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3"><div className="font-medium">{m.name}</div><a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">{m.url}</a></td>
                    <td className="p-3"><Badge variant="secondary">{m.category}</Badge></td>
                    <td className="p-3"><StatusRow approved={m.approved} published={m.published} /></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => patch(m, { approved: !m.approved })}>
                          {m.approved ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => patch(m, { published: !m.published })} disabled={!m.approved && !m.published}>
                          Publicar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem materiais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Donations tab ----------
type Donation = {
  id: string
  currency: string
  amount: number | null
  donorName: string | null
  donorEmail: string | null
  message: string | null
  status: string
  confirmed: boolean
  createdAt: string
}

function DonationsTab() {
  const { data, loading, reload } = useAdmin<{ donations: Donation[] }>('/api/admin/donations')
  if (loading) return <LoadingRow />
  const list = data?.donations ?? []
  const patch = async (d: Donation, body: object) => {
    try {
      await apiFetch(`/api/admin/donations/${d.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      toast.success('Donativo atualizado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }
  const sendThanks = async (d: Donation) => {
    try {
      await apiFetch(`/api/admin/donations/${d.id}/thankyou`, { method: 'POST', body: JSON.stringify({ channel: 'email' }) })
      toast.success('Agradecimento em fila (envio futuro)')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Intenções de donativo ({list.length})</CardTitle>
        <CardDescription>Confirmação administrativa. BRL e EUR separados. Submeter o formulário não comprova pagamento.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 text-left">
              <tr><th className="p-3">Data</th><th className="p-3">Valor</th><th className="p-3">Dador</th><th className="p-3">Estado</th><th className="p-3 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString('pt')}</td>
                  <td className="p-3"><Badge variant="secondary">{d.currency}</Badge> {d.amount ?? '—'}</td>
                  <td className="p-3"><div className="font-medium">{d.donorName ?? '—'}</div><div className="text-xs text-muted-foreground">{d.donorEmail ?? ''}</div></td>
                  <td className="p-3"><Badge variant={d.confirmed ? 'default' : 'secondary'}>{d.status}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => patch(d, { confirmed: true, status: 'confirmed' })}>Confirmar</Button>
                      <Button size="sm" variant="outline" onClick={() => patch(d, { confirmed: false, status: 'rejected' })}>Rejeitar</Button>
                      <Button size="sm" variant="ghost" onClick={() => sendThanks(d)} title="Enviar agradecimento (requer consentimento)">Agradecer</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem intenções registadas.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Templates tab ----------
type Template = {
  id: string
  channel: string
  language: string
  subject: string | null
  body: string
  active: boolean
}

function TemplatesTab() {
  const { data, loading, reload } = useAdmin<{ templates: Template[] }>('/api/admin/templates')
  const [form, setForm] = useState({ channel: 'email', subject: '', body: '' })
  const [creating, setCreating] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiFetch('/api/admin/templates', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Modelo criado')
      setForm({ channel: 'email', subject: '', body: '' })
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setCreating(false)
    }
  }
  const remove = async (t: Template) => {
    if (!confirm('Eliminar modelo?')) return
    try {
      await apiFetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' })
      toast.success('Eliminado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  if (loading) return <LoadingRow />
  const list = data?.templates ?? []
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Novo modelo de agradecimento</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="email">E-mail</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Assunto (e-mail)</Label><Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Texto</Label><Textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required /></div>
            <Button type="submit" disabled={creating} className="w-full sm:w-auto">{creating ? 'A criar…' : 'Criar modelo'}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Modelos ({list.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{t.channel}</Badge>
                <Button size="sm" variant="ghost" onClick={() => remove(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              {t.subject && <div className="mt-1 text-sm font-medium">{t.subject}</div>}
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">Sem modelos.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Channels tab ----------
type Channel = {
  id: string
  type: string
  label: string
  value: string
  enabled: boolean
  published: boolean
}

function ChannelsTab() {
  const { data, loading, reload } = useAdmin<{ channels: Channel[] }>('/api/admin/contact-channels')
  if (loading) return <LoadingRow />
  const list = data?.channels ?? []
  const patch = async (c: Channel, body: Partial<Channel>) => {
    try {
      await apiFetch(`/api/admin/contact-channels/${c.id}`, { method: 'PUT', body: JSON.stringify(body) })
      toast.success('Canal atualizado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Canais de contacto</CardTitle>
        <CardDescription>WhatsApp desativado por defeito. Só aparece na página pública quando ativado e publicado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.map((c) => (
          <div key={c.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><Badge variant="secondary">{c.type}</Badge><span className="font-medium">{c.label}</span></div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{c.value}</div>
              </div>
              <div className="flex items-center gap-3">
                <ToggleLine label="Ativo" checked={c.enabled} onChange={(v) => patch(c, { enabled: v })} />
                <ToggleLine label="Publicado" checked={c.published} onChange={(v) => patch(c, { published: v })} />
              </div>
            </div>
            <div className="mt-2"><StatusRow approved={c.enabled} published={c.published} /></div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Sem canais.</p>}
      </CardContent>
    </Card>
  )
}

// ---------- Audit tab ----------
type Log = { id: string; actor: string; action: string; entity: string | null; entityId: string | null; detail: string | null; createdAt: string }
function AuditTab() {
  const { data, loading } = useAdmin<{ logs: Log[] }>('/api/admin/audit')
  if (loading) return <LoadingRow />
  const list = data?.logs ?? []
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Registo de auditoria</CardTitle>
        <CardDescription>Últimas 200 ações sensíveis (apenas leitura).</CardDescription></CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[28rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 text-left">
              <tr><th className="p-3">Data</th><th className="p-3">Ator</th><th className="p-3">Ação</th><th className="p-3">Detalhe</th></tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString('pt')}</td>
                  <td className="p-3">{l.actor}</td>
                  <td className="p-3 font-mono text-xs">{l.action}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.detail ?? '—'}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem registos.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
