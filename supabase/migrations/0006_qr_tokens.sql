-- ============================================================================
-- 0006_qr_tokens.sql
-- Cryptographic QR tokens that map to a single table. The token is the only
-- value exposed in customer-facing URLs; table_id is never leaked.
-- ============================================================================

create table if not exists qr_tokens (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null unique references tables(id) on delete cascade,
  token       text not null unique,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index if not exists qr_tokens_token_idx on qr_tokens(token) where revoked_at is null;

alter table qr_tokens enable row level security;
