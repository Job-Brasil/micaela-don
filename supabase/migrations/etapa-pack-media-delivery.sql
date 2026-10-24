-- ============================================================================
-- Pack Media delivery migration — adds delivery_asset_ref + delivery_description
-- to the campaign table. Idempotent, additive, non-destructive.
-- Run in Supabase SQL Editor.
-- ============================================================================

alter table campaign add column if not exists delivery_asset_ref text;
alter table campaign add column if not exists delivery_description text;
