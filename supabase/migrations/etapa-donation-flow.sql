-- ============================================================================
-- Donation flow migration — adds donor_country, payment_method, want_pack_media,
-- amount_minor to donation_intent. Idempotent, additive, non-destructive.
-- Run in Supabase SQL Editor. All statements use ADD COLUMN IF NOT EXISTS.
-- ============================================================================

alter table donation_intent add column if not exists amount_minor integer;
alter table donation_intent add column if not exists donor_country text;
alter table donation_intent add column if not exists payment_method text;
alter table donation_intent add column if not exists want_pack_media boolean not null default false;

-- Backfill: copy existing Float amounts to amount_minor (cents) for existing intents
update donation_intent
set amount_minor = round(amount * 100)::integer
where amount_minor is null and amount is not null;
