-- ============================================================================
-- 0003_categories.sql
-- Menu categories.
-- ============================================================================

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

alter table categories enable row level security;
