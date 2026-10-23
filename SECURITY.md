# Política de Segurança — Um Gesto de Apoio

## Reportar vulnerabilidades

Para reportar uma vulnerabilidade, contacte o administrador da campanha por canal
privado. **Não abra issues públicas** que exponham falhas de segurança.

## Princípios

1. **Dados de pagamento** (IBAN, BIC, titular) e **QR PIX** são privados por defeito.
   Só são expostos publicamente após verificação e publicação **administrativa**
   explícita. Nunca são versionados em ficheiros de código.
2. **Consentimento** — qualquer comunicação de agradecimento exige um
   `ConsentRecord` válido por canal. Sem consentimento, o envio é bloqueado e
   registado em auditoria.
3. **Segredos no servidor** — `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH` e
   `SESSION_SECRET` permanecem apenas em variáveis de ambiente server-side. O
   frontend usa apenas a chave *publishable* do Supabase.
4. **Autenticação admin** — sessão HMAC (cookie httpOnly) com payload base64url JSON
   + assinatura; verificação em cada pedido protegido. TTL: 12h.
5. **Defesa em profundidade** — RLS no Supabase + gating server-side nas API routes +
   guardrails nos PUT/PATCH (publicar exige aprovar; aprovar PIX exige QR; etc.).
6. **Auditoria** — todas as ações sensíveis são registadas em `AuditLog`
   (append-only).

## Tokens de acesso

Qualquer token de acesso pessoal (GitHub, etc.) partilhado em comunicações deve ser
considerado comprometido e **revogado**. Este repositório não contém nem utiliza
tokens. O deploy usa um token temporário que deve ser revogado após o push.

## Confirmarão dados antes de publicar

Antes de qualquer publicação pública de dados de pagamento ou QR:

- verificar os dados bancários reais contra a fonte oficial;
- testar a legibilidade e o destinatário do QR PIX;
- testar em dispositivos móveis;
- confirmar que o WhatsApp permanece desativado até integração oficial.
