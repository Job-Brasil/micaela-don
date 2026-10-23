-- ============================================================================
-- Supabase Row Level Security — "Um Gesto de Apoio (Micaela)"
-- Run AFTER schema.sql, in the Supabase SQL editor.
--
-- Principles:
--  * anon (publishable key) can read ONLY published+approved public data.
--  * anon can INSERT donation intents and consents, but NEVER read or mutate them.
--  * anon can NEVER read payment data that is not published+approved.
--  * anon can NEVER read pix_config.qr_image_data directly (server endpoint only).
--  * All admin mutations (writes to config tables, confirmations, approvals,
--    audit reads) require the SERVICE ROLE key, used ONLY on the server.
--  * WhatsApp link (contact_channel) is hidden unless enabled AND published.
-- ============================================================================

-- Enable RLS everywhere
alter table site_setting        enable row level security;
alter table site_asset          enable row level security;
alter table payment_config      enable row level security;
alter table pix_config          enable row level security;
alter table donation_intent     enable row level security;
alter table campaign_material   enable row level security;
alter table thank_you_template  enable row level security;
alter table contact_channel     enable row level security;
alter table consent_record      enable row level security;
alter table outbound_message    enable row level security;
alter table audit_log           enable row level security;

-- Drop existing policies (idempotent re-runs)
drop policy if exists "public read site_setting" on site_setting;
drop policy if exists "public read site_asset" on site_asset;
drop policy if exists "public read payment_config" on payment_config;
drop policy if exists "public read campaign_material" on campaign_material;
drop policy if exists "public read contact_channel" on contact_channel;
drop policy if exists "anon insert donation_intent" on donation_intent;
drop policy if exists "anon insert consent_record" on consent_record;

-- ---- PUBLIC READS (anon) ----

create policy "public read site_setting"
  on site_setting for select to anon, authenticated
  using (true);

-- site_asset: anon can only read published assets (hero/material cover images).
-- The image bytes are served via the server endpoint which checks published flag.
create policy "public read site_asset"
  on site_asset for select to anon, authenticated
  using (published = true);

create policy "public read payment_config"
  on payment_config for select to anon, authenticated
  using (published = true and approved = true);

create policy "public read campaign_material"
  on campaign_material for select to anon, authenticated
  using (approved = true and published = true);

create policy "public read contact_channel"
  on contact_channel for select to anon, authenticated
  using (enabled = true and published = true);

-- NOTE: NO anon select policy on pix_config → anon CANNOT read the table at all,
-- including qr_image_data. The QR image is served via a server endpoint that
-- checks approved+published, mirroring the Prisma app's /api/public/pix-qr.
-- NOTE: NO anon select policy on thank_you_template, outbound_message, audit_log,
-- donation_intent, consent_record → anon cannot read them.

-- ---- PUBLIC INSERTS (anon) ----

create policy "anon insert donation_intent"
  on donation_intent for insert to anon, authenticated
  with check (true);

create policy "anon insert consent_record"
  on consent_record for insert to anon, authenticated
  with check (true);

-- ---- ADMIN MUTATIONS ----
-- All writes to config/approval tables are performed with the SERVICE ROLE key,
-- which bypasses RLS. The web app's API routes enforce authorization server-side
-- (HMAC admin session) BEFORE issuing any service-role write.
--
-- For a stricter setup you can additionally create authenticated-role policies,
-- but the recommended deployment keeps ALL mutating DB access behind the service
-- role key on the server only.

-- Optional: a SECURITY DEFINER function to read published PIX metadata (no bytes).
-- Returns ONLY: availability flag, beneficiary name, and the controlled server URL.
-- The actual QR image bytes are NEVER returned here; they are served by the server
-- endpoint /api/public/pix-qr which re-checks approved && published && qr_image_data.
-- All three fields are gated on (approved AND published AND qr_image_data IS NOT NULL)
-- so no metadata leaks before the QR is fully verified and published.
create or replace function public.get_published_pix()
returns table (
  available boolean,
  beneficiary_name text,
  qr_url text
)
language sql security definer set search_path = public as $$
  select
    case when (approved and published and qr_image_data is not null) then true else false end,
    case when (approved and published and qr_image_data is not null) then beneficiary_name else null end,
    case when (approved and published and qr_image_data is not null)
         then '/api/public/pix-qr' else null end
  from pix_config
  order by updated_at desc
  limit 1;
$$;

-- pix_config has NO anon SELECT policy (above), so anon cannot read the table directly.
-- Revoke all table privileges from anon/authenticated as defence-in-depth; the app uses
-- Prisma (postgres superuser) which bypasses RLS, so it does not need these grants.
revoke all on pix_config from anon, authenticated;
-- Grant only EXECUTE on the metadata function (returns no image bytes).
grant execute on function public.get_published_pix() to anon, authenticated;
