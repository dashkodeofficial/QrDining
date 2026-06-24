-- ============================================================================
-- 0012_waiter_requests.sql
-- Customer-initiated calls for waiter assistance.
-- ============================================================================

create table if not exists waiter_requests (
  id                 uuid primary key default gen_random_uuid(),
  table_session_id   uuid not null references table_sessions(id) on delete cascade,
  table_id           uuid not null references tables(id) on delete cascade,
  type               waiter_request_type not null,
  status             waiter_request_status not null default 'PENDING',
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references staff(id) on delete set null
);

create index if not exists waiter_requests_pending_idx on waiter_requests(status, created_at) where status <> 'RESOLVED';

alter table waiter_requests enable row level security;
