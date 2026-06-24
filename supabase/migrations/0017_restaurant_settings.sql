-- ============================================================================
-- 0017_restaurant_settings.sql
-- Single-row restaurant configuration. Used for receipts, currency, tax.
-- ============================================================================

create table if not exists restaurant_settings (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null default 'Restaurant',
  address                text,
  phone                  text,
  email                  text,
  tax_rate_percent       int  not null default 0,
  service_charge_percent int  not null default 0,
  receipt_footer         text,
  updated_at             timestamptz not null default now()
);

-- Ensure only one settings row exists.
create unique index if not exists restaurant_settings_singleton_idx
  on public.restaurant_settings ((1));

alter table restaurant_settings enable row level security;
