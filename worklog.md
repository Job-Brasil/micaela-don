# Worklog — Um Gesto de Apoio (Micaela)

Rasto de trabalho incremental. Cada secção começa com `---`.

---
Task ID: 1
Agent: orchestrator (main)
Task: Fundação de segurança — worklog, .env, .gitignore, schema Prisma.

Work Log:
- Inspecionado o projeto: é o scaffold Next.js 16 de origem (page.tsx mostra só o logo; schema Prisma tem apenas User/Post demo). Stack disponível: NextAuth, Prisma+SQLite, shadcn/ui completo, zod, react-hook-form, framer-motion, sonner.
- dev server já corre em :3000 (dev.log: Ready).
- .gitignore já cobre .env*, *.pem, dev.log, skills/, .claude, *.tsbuildinfo — confirmado seguro.
- A confirmar: .env só tem DATABASE_URL. Vou acrescentar (sem commit): SUPABASE_URL, SUPABASE_ANON_KEY (publishable), ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET.

Stage Summary:
- Achave GitHub PAT partilhada pelo utilizador está COMPROMETIDA — não será usada; utilizador deve revogar.
- App usará Prisma+SQLite local + enforcement server-side; supabase/*.sql espelham o modelo para RLS futura.
- Apenas a rota / é visível; admin embutido na mesma página, autenticado por sessão HMAC httpOnly.
- Próximos passos: schema Prisma (sem enums — SQLite), lib/auth + audit, API routes, seed, frontend delegado a subagent.

---
Task ID: 4
Agent: orchestrator (main)
Task: Frontend de rota única (pública + admin embutido).

Work Log:
- Extraída getPublicSite() em src/lib/public-data.ts (fonte única partilhada pela rota API e pela página).
- src/app/page.tsx: server component, força dynamic, carrega getPublicSite() e renderiza <PublicSite initial/>.
- src/components/public-site.tsx: hero, história, secção donativos com tabs EUR/PIX (gating de publicação/aprovação), formulário de intenção (BRL/EUR separados, sem ser prova de pagamento), galeria de materiais aprovados, footer sticky com botão Admin.
- src/components/admin-app.tsx: overlay full-screen com login HMAC + dashboard (Site, EUR, PIX, Materiais, Donativos, Modelos, Canais, Auditoria). Tudo via /api/admin/* com cookie httpOnly.
- Layout atualizado: lang=pt, metadata da campanha, Toaster via sonner.
- Lint limpo (0 erros, 0 warnings). dev.log: GET / 200 sem erros de runtime.

Stage Summary:
- Apenas a rota / é visível; admin embutido na mesma página (sem rota extra).
- Dados sensíveis só aparecem quando approved && published; QR nunca em /public.
- WhatsApp desativado por defeito; não aparece até enabled+published.

---
Task ID: 5
Agent: orchestrator (main)
Task: Supabase DDL + RLS + README de deploy.

Work Log:
- supabase/schema.sql: DDL espelhando o modelo Prisma (sem enums, sem segredos).
- supabase/rls.sql: RLS — anon só lê published+approved; sem leitura de pix_config.qr_image_data; inserts só em donation_intent/consent_record; função get_published_pix() SECURITY DEFINER.
- README.md: instruções de deploy Vercel, env vars, checklist pré-publicação, aviso de revogação de tokens GitHub partilhados.
- .env.example: template sem segredos.

Stage Summary:
- Caminho de migração para Supabase pronto (modelo 1:1). Enforcement real continua server-side.

---
Task ID: 6
Agent: orchestrator (main)
Task: Verificação end-to-end com Agent Browser.

Work Log:
- Página pública renderiza sem erros de runtime/hydration (console e errors vazios).
- Tabs EUR/PIX: ambas mostram "em verificação administrativa" quando em rascunho (gating correto). Não foi gerado nenhum QR PIX fictício.
- Formulário de intenção de donativo: POST /api/public/donation-intent → 201; DB confirma intent (status received) + consentRecord (email) + auditLog. Submissão não confirma pagamento.
- Admin: botão Admin no rodapé abre login; encontrada e corrigida uma falha de codificação da sessão (o email continha '.' e quebrava o delimitador) → migrado para base64url JSON + HMAC (2 partes). Após correção, login 200 e GET /api/admin/site 200.
- Dashboard carrega as 8 tabs; tab EUR carrega os dados bancários (Micaela Gomes De Jesus, AS LHV Pank, EE617777000166893634, LHVBEE22).
- Fluxo aprovar+publicar: PUT 200 → reload → página pública passa a mostrar os dados bancários. Confirmado end-to-end.
- WhatsApp permanece oculto (desativado por defeito); PIX permanece privado.
- Mobile 375px: sem overflow horizontal (scrollW=clientW). Footer com mt-auto em min-h-screen flex-col (sticky garantido por CSS).
- VLM sobre screenshot desktop: hero com título+CTAs, layout limpo sem sobreposições, secção EUR/PIX com formulário, rodapé presente.
- Estado final reposto: PaymentConfig em rascunho (approved=false, published=false) — admin deve verificar antes de publicar.

Stage Summary:
- Aplicação funcional e segura, verificada no browser. Pronta para o utilizador preview.
- Aviso crítico mantido: token GitHub partilhado deve ser revogado; deploy manual pelo utilizador com token novo (README inclui passos).

---
Task ID: 7
Agent: orchestrator (main)
Task: README tecnico completo + push para GitHub.

Work Log:
- Escrito README.md tecnico integral (17 seções: visão, stack, arquitetura, modelo de dados, API, segurança, fluxos, config local, painel, Supabase, deploy Vercel, materiais Drive, env vars, scripts, estrutura, checklist, governança).
- Criado SECURITY.md (política de segurança e reporte).
- Refined .gitignore: .env* era demasiado abrangente; agora .env/.env.local/.env.production gitignored mas .env.example permitido.
- Removido .env do tracking (git rm --cached .env) — estava tracked num commit anterior (0902edc). Marcado para o utilizador: histórico antigo contém o .env; idealmente squash/force-push limpo OU rotação de todos os segredos após deploy (SESSION_SECRET, ADMIN_PASSWORD_HASH) — feito via .env local que NÃO vai para Vercel, e o seed regenera config a partir do .env novo em produção.
- Commit 06da7b9: 5 files changed (delete .env, add .env.example + SECURITY.md + README.md + .gitignore).
- Push para https://github.com/Job-Brasil/micaela-don.git branch main (novo branch) — sucesso.
- Verificação via GitHub API: árvore completa de src/ presente; .env, custom.db, private-assets/, dev.log, skills/ NÃO presentes no remoto.
- Remote URL reposta sem token (git config limpo, 0 ocorrências de ghp_).

Stage Summary:
- Repo https://github.com/Job-Brasil/micaela-don atualizado com código + README técnico + SECURITY.md.
- Token GitHub usado apenas para o push (com consentimento do utilizador); removido do .git/config.
- Utilizador deve: (a) revogar o token após deploy; (b) rotação de SESSION_SECRET/ADMIN_PASSWORD_HASH em produção; (c) aplicar supabase/schema.sql + rls.sql; (d) fornecer URLs individuais dos materiais do Drive via painel admin.

---
Task ID: 8
Agent: orchestrator (main)
Task: Corrigir integração Supabase PostgreSQL + resolver erro Vercel.

Work Log:
- AUDITORIA: causa raiz do erro Vercel identificada:
  (1) prisma/schema.prisma tinha provider="sqlite" hardcoded → Prisma Client gerado para SQLite mas em produção DATABASE_URL é PostgreSQL → falha de inicialização em runtime.
  (2) next.config.ts tinha output:"standalone" + build script com cp -r para standalone — desnecessário/problemático no Vercel.
  (3) typescript.ignoreBuildErrors:true escondia erros de tipo reais.
  (4) Sem postinstall:prisma generate — client não era regenerado para o provider correto durante o build.
  (5) db.ts fazia log:['query'] em produção (barulhento, potenciais fugas).
  (6) Sem validação de DATABASE_URL com mensagens claras.
- CORREÇÕES:
  • prisma/schema.prisma → provider="postgresql" (produção/Vercel) + directUrl + @@index.
  • prisma/schema.dev.prisma → provider="sqlite" (sandbox/dev; selecionado via db:*:dev scripts, explícito não ambíguo).
  • package.json: postinstall inteligente (scripts/postinstall.ts escolhe schema conforme DATABASE_URL); build = postinstall + next build; start = next start (sem standalone); db:generate/seed separados para dev e prod.
  • next.config.ts: removido standalone + ignoreBuildErrors; adicionado serverExternalPackages:['@prisma/client'].
  • src/lib/db.ts: lazy init via Proxy (evita falhar "collect page data" do build); logs condicionados por ambiente (query só em dev); assertDatabaseUrl com mensagens claras sem expor o valor da URL.
  • scripts/seed.ts: guarda de ambiente (aborta se não --dev e DATABASE_URL não for postgres); idempotente (upsert create-only preserva edits admin).
  • tsconfig.json: exclui examples/mini-services/tests/skills/scripts do type-checking (não são parte da app).
  • supabase/schema.sql: adicionados índices correspondentes aos @@index do schema Prisma.
  • .env.example: documentado formato PostgreSQL (porta 6543 + ?pgbouncer=true&connection_limit=1) e DIRECT_DATABASE_URL (porta 5432 para migrações).
- VALIDAÇÃO:
  • bun run lint: 0 erros, 0 warnings.
  • bun run build: ✓ Compiled successfully, sem erros TypeScript (type-checking agora ativo), todas as rotas marcadas como Dynamic.
  • Dev server (SQLite): GET / 200; POST /api/public/donation-intent 201; BD confirma intent persistido; login admin 200 + dashboard carrega 8 tabs.
  • Agent Browser: sem erros de runtime/hydration; formulário e login funcionais.

Stage Summary:
- Causa do erro Vercel corrigida: provider PostgreSQL + postinstall generate + lazy init + build limpo.
- Dev (SQLite sandbox) e Prod (PostgreSQL Supabase) têm schemas separados e explícitos; seleção via --schema e postinstall inteligente.
- Próximo passo: utilizador define DATABASE_URL (postgres) + DIRECT_DATABASE_URL na Vercel, aplica supabase/schema.sql + rls.sql, corre seed contra prod, redeploy.
