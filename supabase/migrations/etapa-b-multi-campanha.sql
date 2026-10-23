-- ============================================================================
-- ETAPA B migration — Multi-campanha (idempotente, aditiva, não destrutiva)
-- Run this in the Supabase SQL editor ONCE. All statements use IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Preserves ALL existing data: the Micaela campaign is backfilled with
-- campaign_id='micaela' via column defaults.
-- ============================================================================

-- 1) New campaign table
create table if not exists campaign (
  id              text primary key default gen_random_uuid()::text,
  slug            text unique not null,
  name            text not null,
  status          text not null default 'draft',
  is_default      boolean not null default false,
  currency        text not null default 'EUR',
  country         text not null default 'PT',
  seo_title       text,
  seo_description text,
  canonical_url   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_campaign_status on campaign (status);

-- 2) Insert the Micaela campaign as default (idempotent)
insert into campaign (id, slug, name, status, is_default, currency, country)
values ('micaela', 'micaela', 'A história da Micaela', 'published', true, 'EUR', 'PT')
on conflict (id) do nothing;

-- 3) Add campaign_id column to existing tables (default 'micaela' = backfill)
alter table site_setting       add column if not exists campaign_id text not null default 'micaela';
alter table payment_config     add column if not exists campaign_id text not null default 'micaela';
alter table pix_config         add column if not exists campaign_id text not null default 'micaela';
alter table donation_intent    add column if not exists campaign_id text not null default 'micaela';
alter table donation_intent    add column if not exists donor_whatsapp text;
alter table campaign_material  add column if not exists campaign_id text not null default 'micaela';
alter table contact_channel    add column if not exists campaign_id text not null default 'micaela';
alter table consent_record     add column if not exists campaign_id text not null default 'micaela';
alter table outbound_message   add column if not exists campaign_id text not null default 'micaela';

-- 4) Unique constraint: one setting value per (campaign, key).
create unique index if not exists ux_site_setting_campaign_key on site_setting (campaign_id, key);

-- 5) Indexes for campaign-scoped queries
create index if not exists idx_site_setting_campaign      on site_setting (campaign_id);
create index if not exists idx_payment_config_campaign   on payment_config (campaign_id);
create index if not exists idx_pix_config_campaign       on pix_config (campaign_id);
create index if not exists idx_donation_intent_campaign  on donation_intent (campaign_id);
create index if not exists idx_campaign_material_campaign on campaign_material (campaign_id, approved, published);
create index if not exists idx_contact_channel_campaign  on contact_channel (campaign_id);
create index if not exists idx_consent_record_campaign   on consent_record (campaign_id, channel, donor_email);
create index if not exists idx_outbound_message_campaign on outbound_message (campaign_id, status);

-- 6) Enable RLS on the new campaign table
alter table campaign enable row level security;
drop policy if exists "public read campaign" on campaign;
create policy "public read campaign"
  on campaign for select to anon, authenticated
  using (status = 'published');
