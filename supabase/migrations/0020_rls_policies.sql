-- ============================================================================
-- 0020_rls_policies.sql
-- Row-level security policies for every table.
-- Drop-then-create pattern makes the file idempotent.
-- ============================================================================

-- Helper to (re)create a policy cleanly.
create or replace function recreate_policy(t text, p text) returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on %I', p, t);
end $$;

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
select recreate_policy('categories', 'categories_public_read');
create policy categories_public_read on categories for select using (true);
select recreate_policy('categories', 'categories_admin_write');
create policy categories_admin_write on categories for all
  using (is_staff_admin()) with check (is_staff_admin());

-- ---------------------------------------------------------------------------
-- MENU ITEMS
-- ---------------------------------------------------------------------------
select recreate_policy('menu_items', 'menu_items_public_read');
create policy menu_items_public_read on menu_items for select to anon, authenticated
  using (available = true);
select recreate_policy('menu_items', 'menu_items_staff_read');
create policy menu_items_staff_read on menu_items for select to authenticated
  using (true);
select recreate_policy('menu_items', 'menu_items_admin_write');
create policy menu_items_admin_write on menu_items for all
  using (is_staff_admin()) with check (is_staff_admin());

-- ---------------------------------------------------------------------------
-- TABLES / QR TOKENS
-- ---------------------------------------------------------------------------
select recreate_policy('tables', 'tables_staff_all');
create policy tables_staff_all on tables for all to authenticated
  using (true) with check (true);
select recreate_policy('qr_tokens', 'qr_tokens_staff_all');
create policy qr_tokens_staff_all on qr_tokens for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- TABLE SESSIONS / ORDERS / ORDER ITEMS
-- ---------------------------------------------------------------------------
select recreate_policy('table_sessions', 'sessions_staff_all');
create policy sessions_staff_all on table_sessions for all to authenticated
  using (true) with check (true);
select recreate_policy('orders', 'orders_staff_all');
create policy orders_staff_all on orders for all to authenticated
  using (true) with check (true);
select recreate_policy('order_items', 'order_items_staff_all');
create policy order_items_staff_all on order_items for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- STAFF
-- ---------------------------------------------------------------------------
select recreate_policy('staff', 'staff_self_read');
create policy staff_self_read on staff for select to authenticated
  using (user_id = auth.uid() or is_staff_admin());
select recreate_policy('staff', 'staff_admin_write');
create policy staff_admin_write on staff for all
  using (is_staff_admin()) with check (is_staff_admin());

-- ---------------------------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------------------------
select recreate_policy('roles', 'roles_staff_read');
create policy roles_staff_read on roles for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- WAITER REQUESTS / FEEDBACK / PAYMENTS / ACTIVITY LOGS
-- ---------------------------------------------------------------------------
select recreate_policy('waiter_requests', 'requests_staff_all');
create policy requests_staff_all on waiter_requests for all to authenticated
  using (true) with check (true);

select recreate_policy('feedback', 'feedback_staff_read');
create policy feedback_staff_read on feedback for select to authenticated using (true);

select recreate_policy('payments', 'payments_staff_all');
create policy payments_staff_all on payments for all to authenticated
  using (true) with check (true);

select recreate_policy('activity_logs', 'logs_staff_read');
create policy logs_staff_read on activity_logs for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- RESTAURANT SETTINGS
-- ---------------------------------------------------------------------------
select recreate_policy('restaurant_settings', 'settings_public_read');
create policy settings_public_read on restaurant_settings
  for select to anon, authenticated using (true);
select recreate_policy('restaurant_settings', 'settings_staff_update');
create policy settings_staff_update on restaurant_settings
  for update to authenticated using (true) with check (true);
