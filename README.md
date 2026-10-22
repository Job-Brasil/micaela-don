# Um Gesto de Apoio — A história da Micaela

> Campanha de solidariedade. Aplicação web para apresentação da história, receção de
> intenções de donativo (EUR por transferência SEPA / BRL por PIX) e gestão
> administrativa segura de pagamentos, materiais, agradecimentos e contactos.

Aplicação **Next.js 16** (App Router) com **Prisma**, **shadcn/ui**, validação **zod**,
autenticação admin por **sessão HMAC httpOnly** e arquitetura preparada para integração
futura com **WhatsApp Business** e **e-mail**.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitetura](#3-arquitetura)
4. [Modelo de dados](#4-modelo-de-dados)
5. [Superfície de API](#5-superfície-de-api)
6. [Modelo de segurança](#6-modelo-de-segurança)
7. [Fluxos principais](#7-fluxos-principais)
8. [Configuração local](#8-configuração-local)
9. [Painel de administração](#9-painel-de-administração)
10. [Supabase (produção)](#10-supabase-produção)
11. [Deploy para Vercel](#11-deploy-para-vercel)
12. [Materiais da campanha (Google Drive)](#12-materiais-da-campanha-google-drive)
13. [Variáveis de ambiente](#13-variáveis-de-ambiente)
14. [Scripts de utilidade](#14-scripts-de-utilidade)
15. [Estrutura de pastas](#15-estrutura-de-pastas)
16. [Checklist pré-publicação](#16-checklist-pré-publicação)
17. [Notas de segurança e governança](#17-notas-de-segurança-e-governação)

---

## 1. Visão geral

A aplicação expõe **uma única rota pública** (`/`) que apresenta:

- a história da campanha (textos editáveis pelo administrador);
- secção de apoio com dois métodos: **EUR** (transferência bancária SEPA) e **PIX** (BRL);
- formulário de **intenção de donativo** (que **não comprova pagamento**);
- galeria de **materiais aprovados** da campanha;
- rodapé com canais de contacto (apenas os ativados e publicados).

O **painel de administração** está embutido na mesma rota (abre-se por um botão no
rodapé) e é protegido por sessão HMAC. Permite gerir: conteúdo público, dados de
pagamento EUR, QR PIX, materiais, donativos, modelos de agradecimento, canais de
contacto e auditoria.

### Princípios de desenho

- **Nada é público por defeito.** Dados de pagamento, QR PIX, WhatsApp e materiais
  entram todos em **rascunho / desativado** e só aparecem na página pública quando um
  administrador autorizado os **verifica e publica** explicitamente.
- **Um formulário submetido não é prova de pagamento.** A confirmação é administrativa
  (ou, no futuro, por uma integração de pagamentos validada).
- **BRL e EUR são separados** em todos os registos.
- **Consentimento explícito e registado por canal** para qualquer comunicação de
  agradecimento. Sem consentimento válido, o envio é bloqueado.
- **Segredos só no servidor.** O frontend usa apenas a chave *publishable* do Supabase.

---

## 2. Stack tecnológico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 + shadcn/ui (New York) |
| Base de dados | Prisma ORM (SQLite em desenvolvimento; Supabase/Postgres em produção) |
| Ícones | lucide-react |
| Formulários | react-hook-form + zod |
| Toasts | sonner |
| Animações | framer-motion (disponível) |
| Estado cliente | zustand, TanStack Query (disponíveis) |
| Auth admin | Sessão HMAC (cookie httpOnly) + scrypt (sem NextAuth para o admin) |
| SDK IA | z-ai-web-dev-sdk (disponível para funcionalidades futuras) |

---

## 3. Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (visitante / admin)                                  │
│  ─ Rota única / (server component) → <PublicSite/>            │
│  ─ <AdminApp/> (overlay) abre via botão no rodapé             │
└──────────────────────────────────────────────────────────────┘
                         │  HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js (Vercel) — runtime Node                             │
│  src/app/api/public/*  → gating de publicação (apenas leitura)│
│  src/app/api/admin/*   → gating de sessão HMAC (leitura+escrita)│
│  src/lib/auth.ts       → verifySession / requireAdmin         │
│  src/lib/audit.ts      → registo de auditoria                │
│  src/lib/public-data.ts→ fonte única do que o visitante vê   │
└──────────────────────────────────────────────────────────────┘
                         │  Prisma Client
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Base de dados                                                │
│  dev:    SQLite (db/custom.db)                                │
│  prod:    Supabase Postgres (com RLS — ver supabase/rls.sql)  │
└──────────────────────────────────────────────────────────────┘
```

**Camadas de enforcement de segurança (defesa em profundidade):**

1. **RLS no Supabase** (produção) — o anon só lê `published AND approved`.
2. **API routes** — `getPublicSite()` / `/api/public/*` filtram por `published && approved`.
3. **Admin routes** — `requireAdmin()` verifica a sessão HMAC antes de qualquer mutação.
4. **Guardrails** nos PUT/PATCH — não é possível publicar sem aprovar, nem aprovar PIX
   sem imagem carregada, nem publicar canal desativado.

---

## 4. Modelo de dados

Definido em `prisma/schema.prisma` (SQLite não suporta enums → os campos de
estado/tipo são `String` validados por zod). O modelo é espelhado 1:1 em
`supabase/schema.sql`.

| Modelo | Finalidade | Gating público |
|---|---|---|
| `SiteSetting` | Blocos de texto editáveis (hero, história, etc.) | sempre legível |
| `PaymentConfig` | Dados bancários EUR | só se `published && approved` |
| `PixConfig` | QR PIX (base64 privado) | só se `published && approved`; imagem via endpoint |
| `DonationIntent` | Intenção de donativo (não é prova de pagamento) | só inserção pública; leitura só admin |
| `CampaignMaterial` | Catálogo de materiais (Drive) | só se `approved && published` |
| `ThankYouTemplate` | Modelos de agradecimento editáveis | só admin |
| `ContactChannel` | WhatsApp / e-mail | só se `enabled && published` |
| `ConsentRecord` | Consentimento explícito por canal | só inserção pública; leitura só admin |
| `OutboundMessage` | Fila de agradecimentos (estados, tentativas) | só admin |
| `AuditLog` | Registo de auditoria (append-only) | só admin |

**Índice único** em `OutboundMessage(channel, toAddress, donationIntentId)` → proteção
contra envios duplicados.

---

## 5. Superfície de API

### Públicas (`/api/public/*`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/public/site` | Payload público (textos + payment se publicado + pix disponibilidade + materiais aprovados + canais publicados) |
| GET | `/api/public/pix-qr` | Imagem do QR PIX (404 se não aprovado/publicado) |
| POST | `/api/public/donation-intent` | Cria intenção de donativo (status `received`); opcionalmente regista consentimento de e-mail |
| POST | `/api/public/consent` | Regista consentimento explícito por canal |

### Admin (`/api/admin/*` — todas exigem sessão HMAC válida, exceto login/session)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/admin/login` | Verifica scrypt e emite cookie HMAC (base64url JSON + assinatura) |
| POST | `/api/admin/logout` | Limpa o cookie |
| GET | `/api/admin/session` | Verifica se a sessão é válida |
| GET/PUT | `/api/admin/site` | Lê/atualiza textos públicos |
| GET/PUT | `/api/admin/payment-config` | Lê/atualiza dados bancários EUR + flags approved/published |
| GET/POST/PUT | `/api/admin/pix` | Lê metadados, carrega QR (reseta aprovação), aprova/publica |
| GET | `/api/admin/pix/preview` | Pré-visualização do QR (antes de publicar) |
| GET/POST | `/api/admin/materials` | Lista / cria material (rascunho) |
| GET/PATCH/DELETE | `/api/admin/materials/[id]` | Detalhe / aprovar+publicar / eliminar |
| GET | `/api/admin/donations` | Lista intenções |
| PATCH | `/api/admin/donations/[id]` | Confirma / rejeita donativo |
| POST | `/api/admin/donations/[id]/thankyou` | Emfila agradecimento (bloqueia sem consentimento; bloqueia duplicados) |
| GET/POST | `/api/admin/templates` | Lista / cria modelo de agradecimento |
| PUT/DELETE | `/api/admin/templates/[id]` | Atualiza / elimina modelo |
| GET/POST | `/api/admin/contact-channels` | Lista / cria canal |
| PUT/DELETE | `/api/admin/contact-channels/[id]` | Atualiza / elimina canal |
| GET | `/api/admin/consents` | Lista consentimentos |
| GET | `/api/admin/messages` | Lista fila de agradecimentos |
| PATCH | `/api/admin/messages/[id]` | Atualiza estado (cancelar, etc.) |
| GET | `/api/admin/audit` | Últimas 200 entradas de auditoria |

---

## 6. Modelo de segurança

### Autenticação admin

- **Email + hash scrypt** em variáveis de ambiente (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`).
- Login verifica a password com scrypt (comparação *timing-safe*) e emite um cookie
  `micaela_admin` httpOnly, `sameSite=lax`, com payload **base64url JSON** + assinatura
  HMAC-SHA256 (`SESSION_SECRET`).
- `requireAdmin()` re-verifica a assinatura e a expiração em **cada** pedido protegido.
- TTL da sessão: 12 horas.

> Nota: o payload usa base64url JSON (não um formato com `.` como delimitador) para que
> emails que contenham pontos (ex.: `admin@micaela.local`) não quebrem a verificação.

### Dados sensíveis

- **Dados bancários EUR** e **QR PIX** nunca entram em ficheiros versionados. Em
  desenvolvimento são lidos do `.env` (gitignored) pelo script `seed.ts` e inseridos
  como **rascunho**. Em produção são geridos pelo painel admin.
- A chave de serviço do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) é **apenas server-side**
  e deve ser definida apenas nas variáveis de ambiente da Vercel.
- O frontend só conhece `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (chave *publishable*, segura para o browser).

### Guardrails de publicação

- Não é possível `published=true` sem `approved=true` (payment, pix, materials).
- Não é possível aprovar/publicar PIX sem QR carregado.
- Não é possível publicar um canal de contacto desativado.
- Re-carregar um QR PIX reinicia sempre `approved` e `published`.
- Não é possível enviar agradecimento sem `ConsentRecord` válido para o canal+destinatário.
- Não é possível enviar duplicados (unique constraint em `OutboundMessage`).

### Auditoria

Todas as ações sensíveis (login, alteração de pagamento, upload de QR, aprovação,
publicação, confirmação de donativo, envio bloqueado, etc.) são registadas em
`AuditLog` (append-only), visível no separador **Auditoria**.

---

## 7. Fluxos principais

### 7.1 Visitante regista intenção de donativo

1. Preenche o formulário (moeda EUR/BRL, valor, nome, e-mail, mensagem, consentimento).
2. `POST /api/public/donation-intent` → cria `DonationIntent` com `status=received`.
3. Se consentimento + e-mail → cria `ConsentRecord(channel=email)`.
4. Regista `AuditLog(action=donation_intent_created)`.
5. A confirmação posterior é **administrativa** (não automática).

### 7.2 Admin publica dados bancários EUR

1. Admin → separador **EUR** → confirma os dados → ativa **Verificado (aprovado)**.
2. `PUT /api/admin/payment-config` com `approved=true` (registado em auditoria).
3. Ativa **Publicado na página pública** → `published=true`.
4. A partir desse momento, `getPublicSite()` inclui os dados na resposta pública.

### 7.3 Admin carrega e publica o QR PIX

1. Admin → separador **PIX** → carrega a imagem (PNG/JPEG/WebP, máx 1.5MB).
2. `POST /api/admin/pix` armazena o base64 e **reseta** `approved`/`published`.
3. Admin visualiza a pré-visualização e, se legível e correto, ativa **Verificado**.
4. Ativa **Publicado** → `/api/public/pix-qr` passa a servir a imagem.

### 7.4 Admin envia agradecimento (fase futura)

1. Admin → separador **Donativos** → **Agradecer** num donativo com e-mail.
2. `POST /api/admin/donations/[id]/thankyou`:
   - Verifica `ConsentRecord` válido para `channel=email` + `donorEmail`.
   - Se não houver → **bloqueia** e regista em auditoria.
   - Verifica duplicado (unique constraint).
   - Cria `OutboundMessage(status=pending)`.
3. O **envio real** depende da integração oficial futura (WhatsApp Business / SMTP).
   A arquitetura de estados (`pending/queued/sent/failed/cancelled`), tentativas,
   erros e cancelamento já está implementada.

---

## 8. Configuração local

```bash
# 1. Instalar dependências
bun install

# 2. Base de dados
bun run db:push          # cria as tabelas em db/custom.db

# 3. Segredos (copie o output para .env)
bun run scripts/gen-session-secret.ts      # → SESSION_SECRET
bun run scripts/hash-password.ts "password" # → ADMIN_PASSWORD_HASH

# 4. Seed (carrega config inicial como RASCUNHO a partir do .env)
bun run scripts/seed.ts

# 5. Dev server
bun run dev
```

Abra a **Preview Panel** (o endereço `localhost:3000` é interno). O painel admin abre
pelo botão **Admin** no rodapé.

**Credenciais de demonstração (sandbox):** `admin@micaela.local` / `micaela-admin-2024`.
**Regenere** em produção.

---

## 9. Painel de administração

Separadores:

| Separador | Função |
|---|---|
| **Site** | Textos públicos editáveis (hero, história, donativos, rodapé) |
| **EUR** | Dados bancários (privados até verificação + publicação) |
| **PIX** | Carregar / verificar / publicar o QR Code (privado até aprovação) |
| **Materiais** | Catálogo (categoria, nome, tipo, URL, aprovação, publicação) |
| **Donativos** | Intenções recebidas; confirmar/rejeitar; emfila agradecimento |
| **Modelos** | Templates de agradecimento editáveis por canal |
| **Canais** | WhatsApp / e-mail (desativados por defeito) |
| **Auditoria** | Últimas 200 ações sensíveis (apenas leitura) |

---

## 10. Supabase (produção)

O sandbox corre Prisma + SQLite com enforcement server-side. Para usar Supabase:

1. Crie o projeto em supabase.co.
2. No SQL Editor, execute **primeiro** `supabase/schema.sql` e **depois** `supabase/rls.sql`.
3. Defina as variáveis de ambiente na Vercel (ver §13).

**Políticas RLS resumidas:**

- `anon` lê `site_setting` (tudo), `payment_config` (só `published AND approved`),
  `campaign_material` (só `approved AND published`), `contact_channel`
  (só `enabled AND published`).
- `anon` **não** tem política de SELECT em `pix_config` → não consegue ler a tabela,
  incluindo `qr_image_data`. A imagem é servida pelo endpoint server-side.
- `anon` **não** lê `donation_intent`, `consent_record`, `outbound_message`,
  `thank_you_template`, `audit_log`.
- `anon` **pode inserir** `donation_intent` e `consent_record` (mas não os ler).
- Mutações administrativas usam a **service role key** (que bypassa RLS) e são
  autorizadas server-side pela sessão HMAC antes de serem emitidas.

---

## 11. Deploy para Vercel

1. Envie o código para o GitHub:
   ```bash
   git init && git add . && git commit -m "Um Gesto de Apoio"
   git remote add origin https://github.com/Job-Brasil/micaela-don.git
   git push -u origin main
   ```
2. Em vercel.com → **Add New Project** → importe `Job-Brasil/micaela-don`.
3. Configure as variáveis de ambiente (ver §13).
4. Deploy. A Vercel deteta Next.js automaticamente.

> **Token GitHub:** use um token de acesso pessoal com permissão `repo`. **Revogue-o**
> após o deploy. Nunca versione o token em ficheiros. Se usou o token na URL do remote,
> reponha a URL limpa após o push: `git remote set-url origin https://github.com/Job-Brasil/micaela-don.git`.

---

## 12. Materiais da campanha (Google Drive)

A pasta partilhada
(`https://drive.google.com/drive/folders/1qsJo77tzS-Na2M-5bl2hWq2kJRMSl8my`) **não é
acedida automaticamente** pela aplicação. O catálogo está pronto em
**Admin → Materiais → Adicionar material**, com campos:

- **nome** — título do material
- **categoria** — foto | video | documento | logo | audio | outro
- **tipo** — mime ou extensão (ex.: `image/png`)
- **url** — URL individual do ficheiro (Google Drive)
- **fonte** — `google_drive` por defeito
- **aprovado** / **publicado** — flags de gating

Inserir manualmente os URLs individuais dos ficheiros aprovados. Só os marcados como
**aprovados + publicados** aparecem na página pública.

---

## 13. Variáveis de ambiente

Defina em `.env` (local) e em **Vercel → Settings → Environment Variables** (produção):

| Variável | Âmbito | Descrição |
|---|---|---|
| `DATABASE_URL` | server | URL Prisma (SQLite local / Supabase em prod) |
| `NEXT_PUBLIC_SUPABASE_URL` | client | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Chave publishable (segura para o browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Chave de serviço (bypass RLS); nunca no frontend |
| `ADMIN_EMAIL` | server | Email do admin autorizado |
| `ADMIN_PASSWORD_HASH` | server | `scrypt:<saltHex>:<hashHex>` (ver §14) |
| `SESSION_SECRET` | server | Segredo HMAC (≥32 chars) |
| `PRIVATE_ASSETS_DIR` | server | Pasta de ativos privados (opcional) |
| `INIT_PAYMENT_*` | server | Config EUR inicial (lida uma vez pelo seed) |
| `INIT_WHATSAPP_*` | server | Contacto WhatsApp inicial (desativado) |

Ver `.env.example` para o template completo (sem segredos).

---

## 14. Scripts de utilidade

| Script | Comando | Output |
|---|---|---|
| Hash de password | `bun run scripts/hash-password.ts "<password>"` | `scrypt:<salt>:<hash>` → `ADMIN_PASSWORD_HASH` |
| Segredo de sessão | `bun run scripts/gen-session-secret.ts` | string aleatória → `SESSION_SECRET` |
| Seed inicial | `bun run scripts/seed.ts` | Carrega config de `.env` como rascunho |

---

## 15. Estrutura de pastas

```
prisma/schema.prisma             modelo de dados
supabase/schema.sql              DDL (espelho do Prisma para Postgres)
supabase/rls.sql                 políticas Row Level Security
scripts/hash-password.ts         gerar ADMIN_PASSWORD_HASH
scripts/gen-session-secret.ts    gerar SESSION_SECRET
scripts/seed.ts                  seed idempotente (rascunho)
src/lib/db.ts                    cliente Prisma
src/lib/auth.ts                  sessão HMAC + scrypt + requireAdmin
src/lib/audit.ts                 registo de auditoria
src/lib/api.ts                   helpers de resposta JSON
src/lib/public-data.ts           fonte única do payload público
src/lib/admin-client.ts          fetch helper (client) para admin
src/app/page.tsx                 rota única (server component)
src/app/layout.tsx               layout + metadata + Toaster
src/app/api/public/*             endpoints públicos (gating de publicação)
src/app/api/admin/*              endpoints admin (gating de sessão)
src/components/public-site.tsx   página pública
src/components/admin-app.tsx     painel admin (overlay)
README.md                        este documento
SECURITY.md                      política de segurança
.env.example                     template de variáveis (sem segredos)
```

---

## 16. Checklist pré-publicação

- [ ] Dados bancários reais verificados contra a fonte oficial.
- [ ] QR Code PIX testado (legibilidade + destinatário correto).
- [ ] Experiência testada em dispositivos móveis.
- [ ] WhatsApp permanece desativado até haver integração oficial.
- [ ] `SESSION_SECRET` e `ADMIN_PASSWORD_HASH` regenerados em produção.
- [ ] `supabase/schema.sql` + `supabase/rls.sql` aplicados e políticas confirmadas.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` definida apenas na Vercel (server-side).
- [ ] Token GitHub (se usado) revogado após o deploy.

---

## 17. Notas de segurança e governança

- **Token GitHub:** qualquer token partilhado em conversas deve ser revogado. O deploy
  faz-se com um token novo; este repositório não contém nem depende de tokens.
- **Dados de pagamento:** nunca em ficheiros versionados; só na base de dados (ou
  `.env` em arranque), e só públicos após verificação administrativa.
- **PIX:** não é gerado nem inventado nenhum QR fictício. O administrador carrega a
  imagem real e verifica-a antes de publicar.
- **Donativos:** o formulário é uma **intenção**, não uma prova de pagamento. A
  confirmação é administrativa. BRL e EUR são separados.
- **Agradecimentos:** consentimento explícito e registado por canal; bloqueio sem
  consentimento; proteção contra duplicados; estados de envio e auditoria completos.
- **Segredos:** a chave de serviço do Supabase e a password de admin permanecem
  apenas no servidor.

---

© Um Gesto de Apoio · A história da Micaela. Campanha de solidariedade.
