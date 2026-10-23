-- ============================================================================
-- Supabase schema — "Um Gesto de Apoio (Micaela)"
-- Mirrors prisma/schema.prisma 1:1. Run this in the Supabase SQL editor.
-- This file is safe to commit: it contains NO secrets and NO payment data.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Editable public text blocks
create table if not exists site_setting (
  key       text primary key,
  value     text not null,
  updated_at timestamptz not null default now()
);

-- Uploaded site assets (images) stored as base64. Served via server endpoint only.
create table if not exists site_asset (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  mime       text not null,
  image_data text not null,
  width      integer,
  height     integer,
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

-- EUR bank transfer config. NEVER public until published AND approved.
create table if not exists payment_config (
  id            text primary key default gen_random_uuid()::text,
  currency      text not null default 'EUR',
  holder        text not null,
  bank          text not null,
  iban          text not null,
  bic           text,
  method        text not null default 'SEPA transfer',
  published     boolean not null default false,
  approved      boolean not null default false,
  approved_by_id text,
  approved_at   timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- PIX (BRL). qr_image_data is PRIVATE until approved + published, and even then
-- is intended to be served through a server endpoint, not a direct anon table read.
create table if not exists pix_config (
  id               text primary key default gen_random_uuid()::text,
  qr_image_data    text,           -- base64; never exposed to anon via RLS
  qr_image_mime    text,
  beneficiary_name text,
  approved         boolean not null default false,
  approved_by_id   text,
  approved_at      timestamptz,
  published        boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Donation INTENT. A submitted form is NOT proof of payment.
create table if not exists donation_intent (
  id              text primary key default gen_random_uuid()::text,
  currency        text not null,
  amount          double precision,
  donor_name      text,
  donor_email     text,
  message         text,
  status          text not null default 'received',
  confirmed       boolean not null default false,
  confirmed_at    timestamptz,
  confirmed_by_id text,
  ip              text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Campaign material catalog. Only approved + published appear publicly.
create table if not exists campaign_material (
  id              text primary key default gen_random_uuid()::text,
  name            text not null,
  category        text not null,
  type            text not null,
  url             text not null,
  source          text not null default 'google_drive',
  cover_image_ref text,
  cover_alt       text,
  description     text,
  published       boolean not null default false,
  approved        boolean not null default false,
  approved_by_id  text,
  approved_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists thank_you_template (
  id         text primary key default gen_random_uuid()::text,
  channel    text not null,
  language   text not null default 'pt',
  subject    text,
  body       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contact channels. WhatsApp is DISABLED by default.
create table if not exists contact_channel (
  id        text primary key default gen_random_uuid()::text,
  type      text not null,
  label     text not null,
  value     text not null,
  enabled   boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists consent_record (
  id         text primary key default gen_random_uuid()::text,
  donor_email text,
  donor_name  text,
  channel    text not null,
  consent    boolean not null,
  ip         text,
  created_at timestamptz not null default now()
);

create table if not exists outbound_message (
  id                 text primary key default gen_random_uuid()::text,
  to_address         text not null,
  channel            text not null,
  template_id        text,
  status             text not null default 'pending',
  attempts           integer not null default 0,
  last_error         text,
  donation_intent_id text,
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (channel, to_address, donation_intent_id)
);

create table if not exists audit_log (
  id        text primary key default gen_random_uuid()::text,
  actor     text not null,
  action    text not null,
  entity    text,
  entity_id text,
  detail    text,
  ip        text,
  created_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'site_setting','payment_config','pix_config','donation_intent',
    'campaign_material','thank_you_template','contact_channel','outbound_message'
  ]
  loop
    execute format('drop trigger if exists trg_%I_touch on %I;', t, t);
    execute format('create trigger trg_%I_touch before update on %I for each row execute function touch_updated_at();', t, t);
  end loop;
end $$;

-- Indexes mirroring @@index directives in prisma/schema.prisma
create index if not exists idx_donation_intent_created_at on donation_intent (created_at);
create index if not exists idx_donation_intent_status      on donation_intent (status);
create index if not exists idx_campaign_material_appr_pub on campaign_material (approved, published);
create index if not exists idx_consent_record_channel_email on consent_record (channel, donor_email);
create index if not exists idx_outbound_message_status     on outbound_message (status);
create index if not exists idx_audit_log_created_at       on audit_log (created_at);

-- ============================================================================
-- V2 migration: adds cover_image_ref, cover_alt, description to campaign_material
-- and creates the site_asset table. Run this section if upgrading an existing DB.
-- All statements are idempotent (IF NOT EXISTS).
-- ============================================================================
create table if not exists site_asset (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  mime       text not null,
  image_data text not null,
  width      integer,
  height     integer,
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table campaign_material add column if not exists cover_image_ref text;
alter table campaign_material add column if not exists cover_alt text;
alter table campaign_material add column if not exists description text;
