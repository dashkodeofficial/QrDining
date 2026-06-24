-- ============================================================================
-- 0007_table_sessions.sql
-- A session represents one continuous customer visit at a table. It is
-- scoped by the QR token that started it.
-- ============================================================================

create table if not exists table_sessions (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references tables(id) on delete restrict,
  qr_token_id uuid not null references qr_tokens(id) on delete restrict,
  status      table_session_status not null default 'ACTIVE',
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists table_sessions_table_idx on table_sessions(table_id);
create index if not exists table_sessions_active_idx on table_sessions(table_id) where ended_at is null;

alter table table_sessions enable row level security;
