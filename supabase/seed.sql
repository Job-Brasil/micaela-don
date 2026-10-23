-- ============================================================================
-- Seed mínimo e idempotente — "Um Gesto de Apoio (Micaela)"
-- Run AFTER schema.sql + rls.sql, in the Supabase SQL editor.
--
-- Idempotent: uses ON CONFLICT DO NOTHING. Re-running does NOT duplicate or
-- overwrite existing rows (admin edits are preserved).
--
-- All sensitive data (bank details, PIX QR, WhatsApp link) is seeded as
-- DRAFT / DISABLED. The admin must verify and publish explicitly. This seed
-- does NOT contain real credentials or payment data.
-- ============================================================================

-- 1) Site settings (editable public text). Portuguese placeholders.
insert into site_setting (key, value) values
  ('hero.eyebrow', 'Campanha de solidariedade'),
  ('hero.title', 'Um Gesto de Apoio — A história da Micaela'),
  ('hero.subtitle', 'Cada contribuição é um gesto concreto de cuidado. Obrigado por fazer parte deste caminho.'),
  ('story.title', 'A história da Micaela'),
  ('story.body', 'Esta página partilha a história da Micaela e abre um canal transparente para quem deseja apoiar. Os dados de pagamento são apresentados apenas após verificação administrativa, e cada intenção de donativo é confirmada manualmente — um formulário submetido não comprova pagamento.'),
  ('donate.title', 'Como apoiar'),
  ('donate.note', 'A confirmação de qualquer donativo é administrativa. Submeter o formulário não comprova pagamento.'),
  ('materials.title', 'Materiais da campanha'),
  ('footer.note', 'Um Gesto de Apoio · A história da Micaela')
on conflict (key) do nothing;

-- 2) EUR payment config — DRAFT (not approved, not published).
--    Holder/bank/IBAN/BIC are left NULL here; the admin enters real values via
--    the panel and verifies them before publishing. This row exists only so the
--    admin UI has a record to edit. (The Prisma seed.ts loads real values from
--    .env INIT_PAYMENT_* when run from the Cloud; this SQL seed stays generic.)
insert into payment_config (id, currency, holder, bank, iban, bic, method, published, approved, notes, created_at, updated_at)
select 'payment-eur', 'EUR', '', '', '', null, 'Transferência bancária SEPA', false, false,
       'Configuração inicial — pendente de verificação administrativa.', now(), now()
where not exists (select 1 from payment_config where id = 'payment-eur');

-- 3) PIX config — empty draft. Admin uploads the QR image and approves it.
insert into pix_config (id, qr_image_data, qr_image_mime, beneficiary_name, approved, published, notes, created_at, updated_at)
select 'pix-brl', null, null, null, false, false,
       'Aguarda carregamento e verificação do QR Code pelo administrador.', now(), now()
where not exists (select 1 from pix_config where id = 'pix-brl');

-- 4) Default thank-you template (email channel). Editable by admin.
insert into thank_you_template (id, channel, language, subject, body, active, created_at, updated_at)
select 'thank-default-email', 'email', 'pt', 'Obrigado pelo seu gesto de apoio',
       'Recebemos o seu registo de intenção de donativo. Agradecemos imensamente o seu gesto. A confirmação será efetuada administrativamente.',
       true, now(), now()
where not exists (select 1 from thank_you_template where id = 'thank-default-email');

-- NOTE: No contact_channel rows are seeded here. The WhatsApp link is private
-- and must be added by the admin via the panel (it stays disabled/unpublished
-- until explicitly enabled + published).

-- Verification query (run manually to confirm):
-- select 'site_setting' t, count(*) n from site_setting
-- union all select 'payment_config', count(*) from payment_config
-- union all select 'pix_config', count(*) from pix_config
-- union all select 'thank_you_template', count(*) from thank_you_template;
