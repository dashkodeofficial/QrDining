-- ============================================================================
-- 0010_roles.sql
-- Human-readable role registry. Mirrors the staff_role enum.
-- ============================================================================

create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  name        staff_role not null unique,
  label       text not null,
  description text
);

alter table roles enable row level security;
