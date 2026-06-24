-- ============================================================================
-- 0009_order_items.sql
-- Line items for each order. Prices and names are snapshotted at order time.
-- ============================================================================

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  menu_item_id     uuid references menu_items(id) on delete set null,
  name             text not null,
  unit_price_cents int  not null check (unit_price_cents >= 0),
  quantity         int  not null check (quantity > 0),
  notes            text
);

create index if not exists order_items_order_idx on order_items(order_id);

alter table order_items enable row level security;
