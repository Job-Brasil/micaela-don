-- ============================================================================
-- ETAPA C migration — Modelo comum de pagamentos (idempotente, aditiva)
-- Creates payment_order, payment_event, delivery_link tables.
-- Adds amount_numeric to donation_intent (Decimal coexists with legacy Float amount).
-- Run this in the Supabase SQL editor. All statements are IF NOT EXISTS.
-- ============================================================================

-- 1) payment_order — central payment record
create table if not exists payment_order (
  id                text primary key default gen_random_uuid()::text,
  campaign_id       text not null,
  donation_intent_id text,
  provider          text not null,
  method            text not null,
  internal_reference text unique not null,
  currency          text not null,
  amount            numeric(12,2) not null,
  status            text not null default 'pending',
  external_id       text,
  customer_email    text,
  customer_name     text,
  customer_phone    text,
  delivery_status   text not null default 'pending',
  metadata          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  confirmed_at      timestamptz,
  refunded_at       timestamptz,
  confirmed_by_id   text,
  unique (provider, external_id)
);
create index if not exists idx_payment_order_campaign_status on payment_order (campaign_id, status);
create index if not exists idx_payment_order_internal_ref     on payment_order (internal_reference);
create index if not exists idx_payment_order_customer_email  on payment_order (customer_email);

-- 2) payment_event — idempotent webhook event log
create table if not exists payment_event (
  id                text primary key default gen_random_uuid()::text,
  order_id          text,
  provider          text not null,
  event_type        text not null,
  external_event_id text unique not null,
  payload_hash      text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  status            text not null default 'pending'
);
create index if not exists idx_payment_event_order  on payment_event (order_id);
create index if not exists idx_payment_event_type    on payment_event (provider, event_type);

-- 3) delivery_link — temporary, unpredictable delivery tokens
create table if not exists delivery_link (
  id          text primary key default gen_random_uuid()::text,
  order_id    text not null,
  token       text unique not null,
  asset_ref   text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_delivery_link_order on delivery_link (order_id);

-- 4) Add amount_numeric to donation_intent (Decimal; legacy Float amount kept for validation)
alter table donation_intent add column if not exists amount_numeric numeric(12,2);

-- 5) Backfill: copy existing Float amounts to Decimal (idempotent — only NULLs)
update donation_intent
set amount_numeric = amount
where amount_numeric is null and amount is not null;

-- 6) RLS: anon has NO access to payment tables. Admin via Prisma (superuser, bypasses RLS).
alter table payment_order  enable row level security;
alter table payment_event  enable row level security;
alter table delivery_link enable row level security;
-- No SELECT/INSERT policies for anon on these tables → fully private.
