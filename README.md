# Um Gesto de Apoio — A história da Micaela

Campanha de solidariedade construída em **Next.js 16 + Prisma + shadcn/ui**, com painel
de administração seguro, pagamentos **EUR** (transferência SEPA) e **PIX** (BRL), e
arquitetura preparada para integração futura de agradecimentos por WhatsApp Business e
e-mail.

## Segurança — leia primeiro

- **Dados de pagamento**: vivem apenas na base de dados (ou `.env` durante o arranque) e
  só aparecem na página pública quando um administrador autorizado os **verifica e
  publica** explicitamente. Nunca são colocados em ficheiros versionados.
- **PIX QR**: o carregamento é feito pelo administrador; fica privado até verificação
  (legível + destinatário correto) e publicação. **Não** é gerado nem inventado nenhum
  QR fictício.
- **WhatsApp**: canal **desativado por defeito**; só aparece publicamente quando ativado
  e publicado. Sem envios automáticos nesta fase.
- **Donativos**: submeter o formulário **não** comprova pagamento. A confirmação é
  administrativa. BRL e EUR são separados.
- **Agradecimentos**: arquitetura com consentimento registado por canal, proteção contra
  duplicados, estados de envio (pendente/falhado/cancelado), auditoria e bloqueio sem
  consentimento válido. O envio real fica para a integração oficial futura.
- **Credenciais**: a chave de serviço do Supabase e a password de admin permanecem
  **apenas no servidor** (variáveis de ambiente da Vercel). O frontend usa apenas a
  chave *publishable* (anónima).

> Aviso: qualquer token de acesso pessoal do GitHub partilhado em conversas deve ser
> **revogado imediatamente**. Este projeto não contém nem utiliza tokens GitHub.

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui
- Prisma ORM (SQLite em desenvolvimento) · modelo espelhado em `supabase/` para RLS
- Autenticação admin por sessão HMAC (cookie httpOnly) + scrypt
- Validação com zod · toasts com sonner

## Desenvolvimento local

```bash
bun install
bun run db:push        # cria as tabelas
bun run scripts/gen-session-secret.ts   # copie o output para SESSION_SECRET no .env
bun run scripts/hash-password.ts "a-sua-password"  # copie para ADMIN_PASSWORD_HASH no .env
bun run scripts/seed.ts                 # carrega config inicial como RASCUNHO (não publicado)
bun run dev
```

Abra a **Preview Panel** (o endereço `localhost:3000` é interno e não é acessível a partir
do exterior). O painel de administração abre-se pelo botão **Admin** no rodapé.

Credenciais de demonstração (sandbox): `admin@micaela.local` / `micaela-admin-2024`.
**Altere** em produção regenerando o hash.

## Painel de Administração (tabs)

- **Site** — textos públicos editáveis (hero, história, donativos, rodapé).
- **EUR** — dados bancários (privados até verificação + publicação).
- **PIX** — carregar/verificar/publicar o QR Code (privado até aprovação).
- **Materiais** — catálogo da pasta da campanha (categoria, nome, tipo, URL, aprovação).
- **Donativos** — intenções recebidas; confirmação/rejeição administrativa; agradecimento.
- **Modelos** — templates de agradecimento editáveis por canal.
- **Canais** — WhatsApp/e-mail (desativados por defeito).
- **Auditoria** — registo das últimas ações sensíveis.

## Supabase (produção)

O sandbox corre Prisma + SQLite com enforcement server-side. Para usar Supabase em
produção:

1. Crie o projeto em supabase.co.
2. Corra `supabase/schema.sql` e depois `supabase/rls.sql` no SQL Editor.
3. Defina as variáveis de ambiente na Vercel (ver abaixo). A chave de serviço
   (`SUPABASE_SERVICE_ROLE_KEY`) deve ser definida **apenas** na Vercel (server-side) e
   nunca exposta ao browser.

As políticas RLS garantem que visitantes só leem dados publicados+aprovados, que não
leem `qr_image_data`, e que apenas inserem intenções/consentimentos (sem os poderem ler
ou alterar).

## Materiais da campanha (Google Drive)

A pasta partilhada (`drive.google.com/drive/folders/1qsJo77tzS…`) **não é acedida
automaticamente**. O catálogo está pronto em **Materiais → Adicionar material**:
insira manualmente os URLs individuais dos ficheiros aprovados. Só os marcados como
**aprovados + publicados** aparecem na página pública.

## Variáveis de ambiente (Vercel)

Defina em **Project → Settings → Environment Variables**:

- `DATABASE_URL` (ou URL do Supabase se trocar o datasource)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; nunca no frontend)

## Deploy para Vercel

1. Crie um repositório a partir deste código e envie-o para o GitHub (use um token
   novo; **nunca** reutilize um token partilhado em conversas):
   ```bash
   git init && git add . && git commit -m "Um Gesto de Apoio"
   git remote add origin https://github.com/Job-Brasil/micaela-don.git
   git push -u origin main
   ```
2. Em vercel.com → **Add New Project** → importe `Job-Brasil/micaela-don`.
3. Configure as variáveis de ambiente (acima).
4. Deploy. A Vercel detecta Next.js automaticamente.

## Antes de publicar (checklist)

- [ ] Verificar os dados bancários reais contra a fonte oficial.
- [ ] Testar o QR Code PIX (legibilidade + destinatário).
- [ ] Testar em dispositivos móveis (responsividade + rodapé fixo).
- [ ] Confirmar que WhatsApp permanece desativado enquanto não houver integração oficial.
- [ ] Regenerar a password de admin e o `SESSION_SECRET` em produção.
- [ ] Aplicar `supabase/schema.sql` + `supabase/rls.sql` e confirmar políticas.

## Estrutura

```
prisma/schema.prisma          modelo de dados
supabase/                     DDL + RLS (espelho do Prisma)
scripts/                      hash-password, gen-session-secret, seed
src/lib/                      auth (HMAC), audit, db, api, public-data
src/app/api/public/           endpoints públicos (gating de publicação)
src/app/api/admin/            endpoints admin (gating de sessão)
src/components/public-site.tsx  página pública (hero, história, donativos, materiais)
src/components/admin-app.tsx     painel admin embutido (login + tabs)
src/app/page.tsx              rota única visível (server component)
```
