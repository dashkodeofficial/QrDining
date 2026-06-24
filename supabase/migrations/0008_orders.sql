-- ============================================================================
-- 0008_orders.sql
-- Orders placed by customers during a table session.
-- ============================================================================

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  table_id          uuid not null references tables(id) on delete restrict,
  table_session_id  uuid not null references table_sessions(id) on delete restrict,
  status            order_status not null default 'PLACED',
  total_cents       int  not null check (total_cents >= 0),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_session_idx on orders(table_session_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_recent_idx on orders(created_at desc);

alter table orders enable row level security;
