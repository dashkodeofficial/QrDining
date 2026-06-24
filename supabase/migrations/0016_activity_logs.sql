-- ============================================================================
-- 0016_activity_logs.sql
-- Audit log of staff actions.
-- ============================================================================

create table if not exists activity_logs (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid references staff(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_logs_created_idx on activity_logs(created_at desc);
create index if not exists activity_logs_entity_idx on activity_logs(entity_type, entity_id);

alter table activity_logs enable row level security;
