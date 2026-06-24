-- ============================================================================
-- 0014_payments.sql
-- Payments (bills) generated for table sessions.
-- ============================================================================

create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  table_session_id  uuid not null references table_sessions(id) on delete restrict,
  amount_cents      int  not null check (amount_cents >= 0),
  method            payment_method not null default 'CASH',
  status            payment_status not null default 'PENDING',
  processed_by      uuid references staff(id) on delete set null,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists payments_session_idx on payments(table_session_id);
create index if not exists payments_status_idx on payments(status);

alter table payments enable row level security;
