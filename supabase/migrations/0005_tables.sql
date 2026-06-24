-- ============================================================================
-- 0005_tables.sql
-- Physical restaurant tables.
-- ============================================================================

create table if not exists tables (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  seat_capacity  int  not null default 4 check (seat_capacity > 0),
  status         table_status not null default 'AVAILABLE',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists tables_status_idx on tables(status);

alter table tables enable row level security;
