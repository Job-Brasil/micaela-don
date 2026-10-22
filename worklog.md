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
