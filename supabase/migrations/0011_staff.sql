-- ============================================================================
-- 0011_staff.sql
-- Staff members linked to Supabase Auth users.
-- ============================================================================

create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique,
  full_name   text not null,
  role        staff_role not null default 'WAITER',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists staff_user_idx on staff(user_id);

alter table staff enable row level security;
