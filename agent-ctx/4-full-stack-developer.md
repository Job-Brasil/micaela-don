# Task 4 — Redesign public-site.tsx V2

**Agent:** full-stack-developer
**Task:** Redesignar COMPLETAMENTE `/home/z/my-project/src/components/public-site.tsx` (página pública). Evolução visual V2: editorial, elegante, humana, profissional.

## Contexto anterior (registos consultados)
- `worklog.md` Task IDs 1, 4, 5, 6, 7, 8, 9 — projeto estável em produção (https://micaela-don.vercel.app), rota única `/`, admin embutido na mesma página.
- API `/api/public/donation-intent` já suporta `consentChannels: string[]` e `donorWhatsapp` (verificado no `route.ts`).
- `PublicSite` tipo definido em `src/lib/public-data.ts` com `hero.{layout, bannerImage, portraitImage, storyImage, ...}`, `materials[].{coverImage, coverAlt, description}`.
- `dev.log`: dev server limpo, GET / 200 sem erros de runtime.
- shadcn/ui instalado; `radio-group.tsx`, `aspect-ratio.tsx`, etc. disponíveis.

## Work Log
1. Lidos: `worklog.md`, `public-site.tsx` (versão anterior), `public-data.ts`, `route.ts` da donation-intent, `layout.tsx`, `globals.css`, `dev.log`.
2. Esboçada paleta editorial quente (rose/terracota/cream/stone) sobre as CSS vars do shadcn, sem mexer em `globals.css`.
3. Reescrito `public-site.tsx` por completo mantendo o contrato do componente (`{ initial: PublicSite }`) e o import `AdminApp`:
   - **Header sticky** refinado: logo circular rose com ring + ícone `Heart`; nav com "História", "Materiais", CTA "Apoiar" (rounded-full) e botão Admin discreto (apenas ícone em mobile).
   - **Hero** com 4 composições segundo `hero.layout`:
     - `none` (e fallback quando imagem em falta): gradiente quente, blurs decorativos, eyebrow pill, H1 serif grande, CTAs.
     - `banner`: full-bleed `<img object-cover>` + overlay escuro vertical + texto sobreposto em fundo branco/dark com pill translúcido.
     - `portrait`: split md:grid-cols-2 — texto à esquerda, imagem 4:5 em moldura com halo gradiente à direita (inversão de ordem em mobile).
     - `story-inline`: hero só de texto; imagem aparece na `StorySection` ao lado do título (md:sticky).
   - **StorySection**: label editorial "01 — A história", ícone `Quote` rose-300, H2 serif, parágrafo `whitespace-pre-line`. Imagem aparece só quando `layout === 'story-inline' && hero.storyImage`.
   - **DonateSection**: label "02 — Como apoiar", Tabs EUR/PIX (rounded-xl), cartões refinados com `rounded-2xl`, halo ícone no header, `CopyRow` preservado com microinterações (hover border, check verde após copiar).
   - **DonationForm** com NOVA lógica de consentimento multi-canal:
     - `RadioGroup` com 4 opções (none/email/whatsapp/both) em cards selecionáveis (`has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/60`).
     - Campos e-mail e WhatsApp aparecem condicionalmente conforme seleção.
     - Placeholder WhatsApp: `+351 912 345 678`; validação cliente com regex E.164 (`/^\+\d{8,15}$/` após strip) e email básico.
     - Frase de consentimento dinâmica (memoizada via `useMemo`): "Consinto em receber um agradecimento por [canal]. Posso retirar este consentimento a qualquer momento."
     - POST envia `consentChannels: string[]` (`[]` para "none", `["email","whatsapp"]` para "both", etc.) e `donorWhatsapp` quando aplicável — alinhado com o schema zod do `route.ts`.
   - **MaterialsSection**: label "03 — Materiais", grid responsivo (1/2/3 cols). Cada `MaterialCard`:
     - Se `coverImage`: imagem topo aspect-[16/10] com badge categoria overlay no canto, zoom-on-hover `motion-safe:duration-300`.
     - Se não: fallback com ícone grande da categoria em gradiente stone + badge overlay.
     - Título serif, descrição `line-clamp-3`, botão "Abrir" rounded-full.
     - Categorias mapeadas a ícones lucide: foto→Image, video→Video, documento→FileText, logo→Shapes, audio→Music, outro→Folder.
   - **Footer**: sticky via `mt-auto`, logo + nome serif, canais de contacto (WhatsApp/email) como botões rounded-full, Separador, copyright + nota de verificação administrativa.
   - **SectionLabel** partilhado: numeração editorial mono rose + linha + label uppercase.
4. Respeitado `prefers-reduced-motion`: todas as transições envolvidas em `motion-safe:duration-*` / `motion-safe:group-hover:*`.
5. Imagens fora do primeiro ecrã: `loading="lazy"`. Hero usa `<img>` nativo (sem next/image).
6. `useMemo` importado; `LucideIcon` type importado para tipar o mapa de ícones.
7. Validado:
   - `bun run lint`: 0 erros, 0 warnings (exit 0).
   - dev.log: `✓ Compiled in 658ms`, `GET / 200` sem runtime errors.
   - curl `http://localhost:3000/` → HTTP 200.

## Stage Summary
- `public-site.tsx` completamente redesenhado (V2) sem tocar em `page.tsx`, `public-data.ts`, `db.ts`, `auth.ts` ou qualquer rota de API.
- Funcionalidades preservadas: tabs EUR/PIX, `CopyRow`, IBAN copy, QR PIX com gating de aprovação/publicação, `<AdminApp />` aberto pelo botão Admin, footer sticky com canais de contacto.
- Funcionalidade NOVA implementada: consentimento multi-canal (none/email/whatsapp/both) com campos condicionais, validação cliente e frase de consentimento RGPD-friendly. POST alinhado com o schema `consentChannels: string[]` já existente no `route.ts`.
- Identidade visual: paleta quente (rose/terracota/cream/stone), tipografia serif nos títulos (via `font-serif`), numeração editorial por secção, microinterações discretas (150-300ms) envolvidas em `motion-safe:` para respeitar `prefers-reduced-motion`.
- Layout responsivo mobile-first (320px-375px verificado via grid responsivo e `max-w-6xl` centrado).
- Lint limpo. Dev server compila sem erros.
