-- ============================================================================
-- 0015_inventory.sql
-- Simple stock tracking for packaged/bottled items. Recipe-level inventory
-- is intentionally out of scope for this iteration.
-- ============================================================================

create table if not exists inventory (
  id                  uuid primary key default gen_random_uuid(),
  menu_item_id        uuid unique references menu_items(id) on delete cascade,
  name                text not null,
  quantity            int  not null default 0 check (quantity >= 0),
  low_stock_threshold int  not null default 0,
  updated_at          timestamptz not null default now()
);

create index if not exists inventory_item_idx on inventory(menu_item_id);

alter table inventory enable row level security;
