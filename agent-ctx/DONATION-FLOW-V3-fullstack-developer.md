# Agent Work Record — Task ID: DONATION-FLOW-V3

**Agent:** full-stack-developer
**Task:** Reescrever `src/components/donation-flow.tsx` — Stripe Embedded Checkout (sem redirect), PixGo ativo, moeda não bloqueada à campanha.

## Contexto consultado
- `/home/z/my-project/worklog.md` — histórico completo do projeto Micaela.
- `src/components/donation-flow.tsx` — versão anterior (redirect para Stripe checkout.stripe.com).
- `src/lib/i18n.ts` — sistema de tradução pt-PT/pt-BR/en, `translate()`, `formatAmount()`, `COUNTRIES`, `getCountry`, `detectCountry`, `detectLocale`.
- `src/lib/providers/stripe.ts` — `createCheckoutSession` já cria sessões com `ui_mode:'embedded'` e devolve `{ sessionId, clientSecret }`.
- `src/app/api/payments/stripe/create-session/route.ts` — devolve `{ clientSecret, reference, orderId }` (sem `url`).
- `src/app/api/payments/pixgo/create/route.ts` — devolve `{ reference, paymentId, qrCode, qrCodeImage, expiresAt }`; exige `customerCpf`.
- `src/app/api/public/payment-methods/route.ts` — já retorna `currencies: string[]` em cada método.
- `src/app/api/public/donation-intent/route.ts` — valida `amountMinor` server-side.
- `node_modules/@stripe/stripe-js` (v10.1.0) — tipagem TypeScript expõe `createEmbeddedCheckoutPage` (renomeado em v10); `initEmbeddedCheckout` (legado) pode existir em runtime no Stripe.js carregado de js.stripe.com.

## Alterações entregues

### 1. `src/components/donation-flow.tsx` (reescrito, 912 linhas)
- **Tipo `PaymentMethodsResponse` atualizado**: `currency: string` → `currencies: string[]` em todos os 4 métodos.
- **Stripe Embedded Checkout inline (sem redirect)**:
  - Após criar a intenção via `POST /api/public/donation-intent` com `paymentMethod='mbway'`, chama `POST /api/payments/stripe/create-session` e recebe `{ clientSecret, reference, orderId }`.
  - Carrega Stripe.js via `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)`.
  - Inicializa checkout embedded via `initEmbeddedCheckout({ clientSecret })` (preferencial, especificado na task) ou `createEmbeddedCheckoutPage` (v10+), com deteção de ambos os nomes em runtime via cast `unknown`.
  - `checkout.mount('#stripe-checkout-container')` — iframe inline dentro de um Card.
  - Estados: `stripeLoading` (spinner), `embeddedCheckoutActive` (Card com container).
  - Cleanup no unmount: `useEffect(() => () => checkoutRef.current?.destroy())` com `StripeEmbeddedCheckout` tipado.
  - Fallback: se `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` não configurada, mostra toast de erro (a API já não devolve `url`).
  - Conclusão: Stripe iframe redireciona para `return_url` (`/pagamento/sucesso?ref=...`) configurado server-side.
- **PixGo ativo (PIX automático inline)**:
  - Quando `paymentMethod='pix_automatic'`, após criar intenção chama `POST /api/payments/pixgo/create` com `{ campaignId, amount, currency:'BRL', customerEmail, customerName, customerCpf, description }`.
  - Resposta guardada em `pixgoResult` state.
  - Novo componente `PixGoPaymentResult`: renderiza QR Code como `<img src="data:image/png;base64,{qrCodeImage}">` quando existe; mostra código Copia e Cola com botão copiar quando `qrCode` existe; mostra expiration em `pt-PT` quando `expiresAt` existe; mensagem de "aguarda confirmação automática".
  - Campo CPF (d-cpf) só aparece condicionalmente quando `cpfRequired = paymentMethod === 'pix_automatic'`; validação 11/14 dígitos; enviado ao endpoint como digits-only.
- **Moeda não bloqueada à campanha**:
  - Filtro de métodos disponíveis agora é `info.available && info.currencies.includes(currency)` (antes `info.currency === currency`).
  - Doador escolhe EUR/BRL livremente via botões no topo; detetor de país sugere moeda inicial mas utilizador pode mudar a qualquer momento.
  - Lista recalculada em `useMemo`; auto-seleção do primeiro método disponível.

### 2. `src/lib/i18n.ts` (5 novas chaves × 3 locales)
Adicionadas a `ptPT`, `ptBR` (via spread) e `en`:
- `stripe.loading` — "A carregar pagamento seguro…" / "Loading secure payment…"
- `stripe.embedded.title` — "Pagamento seguro · MB WAY" / "Secure payment · MB WAY"
- `stripe.embedded.desc` — descrição do iframe inline.
- `pix.copiaecola` — "Código Copia e Cola" / "Copy & Paste code"
- `pixgo.waiting` — "O pagamento aguarda confirmação automática." / "Payment awaiting automatic confirmation."

### 3. `.env.example`
Adicionada `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_.../pk_live_...) documentada como safe para frontend, com comentários explicando que sem ela o fluxo mostra erro em vez de montar o embedded checkout.

## Preservado (sem alterações)
- Sistema i18n com `translate()`, `formatAmount()`, `COUNTRIES`, `getCountry`, `detectCountry`, `detectLocale`.
- Seletor de país com bandeiras emoji (Select).
- Seletor de idioma (PT/BR/EN com globe icon).
- Pack Media checkbox (com hint + note traduzidos).
- Validação server-side de `amountMinor` (POST /api/public/donation-intent).
- Componente `ManualPaymentResult` (PIX manual + bank_transfer).
- Componentes `CopyRow` e `SummaryRow`.
- Estrutura de página única (não multi-etapa).
- Componente começa com `'use client'`; imports i18n mantidos.

## Validação
- `bun run lint` → **0 erros, 0 warnings** (exit 0).
- `npx tsc --noEmit --skipLibCheck` → **0 erros** (exit 0); confirma tipagem correta de `StripeEmbeddedCheckout`, `loadStripe`, `PaymentMethodsResponse` (com `currencies: string[]`) e `PixGoResult`.
- dev.log apresenta erro interno pré-existente do Turbopack ("corrupted database or bug" no cache `.next/dev`) — **não relacionado** com as alterações; não afeta o código em `src/`.

## Resumo
- `donation-flow.tsx` reescrito com 3 alterações principais conforme especificado.
- Tipo `PaymentMethodsResponse` atualizado para `currencies: string[]`.
- Componente permanece `'use client'`; `ManualPaymentResult`, `CopyRow`, `SummaryRow` inalterados.
- Lint e type-check ambos limpos. Pronto para preview.
