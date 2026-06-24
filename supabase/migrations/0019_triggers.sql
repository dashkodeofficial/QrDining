-- ============================================================================
-- 0019_triggers.sql
-- All AFTER / BEFORE triggers, kept together for visibility.
-- ============================================================================

drop trigger if exists trg_menu_items_updated on menu_items;
create trigger trg_menu_items_updated
  before update on menu_items
  for each row execute function set_updated_at();

drop trigger if exists trg_tables_updated on tables;
create trigger trg_tables_updated
  before update on tables
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated
  before update on orders
  for each row execute function set_updated_at();
