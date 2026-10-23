# Task 5 — full-stack-developer — Redesign admin-app.tsx V2

## Goal
Redesign `/home/z/my-project/src/components/admin-app.tsx` (painel administrativo) to evolve from technical labels to human-readable Portuguese labels, organized in sections, with hero config (layout + image uploads) and material covers.

## Constraints
- Only `src/components/admin-app.tsx` touched — no API, lib, prisma, or public-site changes.
- Preserve auth (LoginView, requireAdmin, session check, logout flow).
- Preserve all existing functionality (EUR, PIX, materials CRUD+approve+publish, donations confirm/reject+thankyou, templates, channels, audit).
- Continue to use `apiFetch` from `@/lib/admin-client`.

## API contracts verified
- `POST /api/admin/assets` accepts `{ name, mime, data: dataURL, published }` → returns `{ id, name, mime, width, height, published, previewUrl, publicUrl }`. We use the returned `id` to build `asset:[id]` references and `/api/admin/assets/[id]/preview` as the preview URL.
- `POST/PATCH /api/admin/materials` accept `coverImageRef`, `coverAlt`, `description` (validated by zod schema in the existing route).
- `GET/PUT /api/admin/site` accepts `Record<string,string>` — new hero keys are persisted as plain settings, no schema changes required.

## New components introduced
1. **`ImageUploader`** — reusable component accepting `value`/`onChange`. Detects `asset:[id]` (preview from `/api/admin/assets/[id]/preview`) or external `http(s)://` URL. Provides an upload button (FileReader → dataURL → POST → `asset:[id]`), a text input for URLs, and a remove button. Shows a 20×20 thumbnail preview.
2. **`FieldLabel`** — Label + description helper (text-xs text-muted-foreground).
3. **`SaveButton`** — wraps the standard save flow with `Loader2` spinner while saving and disabled state.
4. **`MaterialEditDialog`** — modal form (Dialog) for editing an existing material's full field set including the cover uploader.

## Site tab — reorganized into 4 cards
1. **Página inicial** — `hero.eyebrow` ("Texto de destaque (acima do título)"), `hero.title` ("Título principal da página"), `hero.subtitle` ("Subtítulo principal", textarea rows=2).
2. **Composição visual** — `hero.layout` Select (none/banner/portrait/story-inline), then three ImageUploader+alt pairs for `hero.bannerImage`+`hero.bannerAlt`, `hero.portraitImage`+`hero.portraitAlt`, `hero.storyImage`+`hero.storyAlt`.
3. **História** — `story.title` ("Título da história"), `story.body` ("Texto da história", textarea rows=5).
4. **Outras secções** — `donate.title`, `donate.note` (textarea rows=2), `materials.title`, `footer.note`.

Single save button at the bottom calls `PUT /api/admin/site` with the whole settings map.

## Materials tab — added covers + edit dialog
- Create form now includes `coverImageRef` (ImageUploader), `coverAlt` (input), `description` (textarea rows=2).
- List switched from a `<table>` to a responsive `<ul>` of rows, each showing:
  - 14×14 cover thumbnail (or placeholder icon if missing)
  - Name + category badge + description (line-clamped) + "Abrir ficheiro" link
  - Status badges
  - Action buttons: Edit (opens dialog), Aprovar/Desaprovar, Publicar/Ocultar, Eliminar
- Edit dialog (`MaterialEditDialog`) loads full material, lets admin edit all fields, calls `PATCH /api/admin/materials/[id]`.

## Other tabs (preserved but polished)
- **PaymentTab (EUR)** — same fields; status row; approve + publish toggles call individual PATCHes.
- **PixTab** — same upload/preview/toggle flow; spinner states improved.
- **DonationsTab** — switched from `<table>` to responsive list; same actions.
- **TemplatesTab** — same flow; loading spinner on submit.
- **ChannelsTab** — same per-channel toggles.
- **AuditTab** — switched from `<table>` to responsive list of action badges.

## UX improvements
- Toast notifications use `description` for richer feedback ("As alterações estão visíveis na página pública.").
- Save buttons disabled while saving; Loader2 spinner visible during async ops.
- FieldLabel includes short help text under each label.
- Responsive: lists use flex-wrap to work on mobile (375px) and desktop.
- No raw JSON, table names, or technical identifiers exposed in labels — only human-readable Portuguese.

## Validation
- `bun run lint` → 0 errors, 0 warnings (after removing 3 unused `eslint-disable-next-line` directives that Next.js didn't need).
- Dev server compiled `admin-app.tsx` cleanly (GET / 200, GET /api/admin/session 401 — both expected).
- The component begins with `'use client'` at the top.

## Files touched
- `src/components/admin-app.tsx` — completely rewritten (~1100 lines, was ~870).
