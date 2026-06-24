-- ============================================================================
-- 0004_menu_items.sql
-- Individual menu items belonging to a category.
-- ============================================================================

create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id) on delete restrict,
  name         text not null,
  description  text,
  price_cents  int  not null check (price_cents >= 0),
  image_url    text,
  available    boolean not null default true,
  popular      boolean not null default false,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists menu_items_category_idx on menu_items(category_id, sort_order);
create index if not exists menu_items_available_idx on menu_items(available) where available = true;

alter table menu_items enable row level security;
