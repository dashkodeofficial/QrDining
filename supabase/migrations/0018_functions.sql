-- ============================================================================
-- 0018_functions.sql
-- Reusable database functions and reporting RPCs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Inventory decrement when an order item is inserted
-- ---------------------------------------------------------------------------
create or replace function decrement_inventory_on_order() returns trigger as $$
declare
  stocked_count int;
begin
  select quantity into stocked_count
    from inventory
    where menu_item_id = new.menu_item_id
    for update;

  if found then
    update inventory
      set quantity = greatest(quantity - new.quantity, 0)
      where menu_item_id = new.menu_item_id;

    if stocked_count - new.quantity <= 0 then
      update menu_items set available = false where id = new.menu_item_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Staff helpers used by RLS policies
-- ---------------------------------------------------------------------------
create or replace function current_staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select s.role from staff s where s.user_id = auth.uid() and s.active;
$$;

create or replace function is_staff_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'ADMIN' from staff where user_id = auth.uid() and active), false);
$$;

-- ---------------------------------------------------------------------------
-- Reporting RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_sales_by_day(start_date date, end_date date)
returns table(date text, revenue_cents bigint, orders bigint) as $$
  select
    to_char(o.created_at::date, 'YYYY-MM-DD') as date,
    coalesce(sum(o.total_cents), 0)::bigint as revenue_cents,
    count(*)::bigint as orders
  from public.orders o
  where o.created_at::date between start_date and end_date
    and o.status <> 'CANCELLED'
  group by o.created_at::date
  order by o.created_at::date;
$$ language sql security definer;

create or replace function public.get_product_stats(start_date date, end_date date)
returns table(name text, quantity bigint, revenue_cents bigint) as $$
  select
    oi.name,
    sum(oi.quantity)::bigint as quantity,
    sum(oi.unit_price_cents * oi.quantity)::bigint as revenue_cents
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at::date between start_date and end_date
    and o.status <> 'CANCELLED'
  group by oi.name
  order by revenue_cents desc;
$$ language sql security definer;

create or replace function public.get_category_stats(start_date date, end_date date)
returns table(name text, revenue_cents bigint, orders bigint) as $$
  select
    c.name,
    sum(oi.unit_price_cents * oi.quantity)::bigint as revenue_cents,
    count(distinct o.id)::bigint as orders
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.menu_items mi on mi.id = oi.menu_item_id
  join public.categories c on c.id = mi.category_id
  where o.created_at::date between start_date and end_date
    and o.status <> 'CANCELLED'
  group by c.name
  order by revenue_cents desc;
$$ language sql security definer;

create or replace function public.get_customer_insights(start_date date, end_date date)
returns table(
  total_orders bigint,
  total_customers bigint,
  average_order_cents bigint,
  peak_hours jsonb,
  average_food_rating numeric,
  average_service_rating numeric
) as $$
  select
    count(distinct o.id)::bigint as total_orders,
    count(distinct o.table_session_id)::bigint as total_customers,
    coalesce(avg(o.total_cents), 0)::bigint as average_order_cents,
    (
      select coalesce(jsonb_agg(jsonb_build_object('hour', hour, 'orders', orders)), '[]'::jsonb)
      from (
        select extract(hour from o2.created_at)::int as hour,
          count(*)::bigint as orders
        from public.orders o2
        where o2.created_at::date between start_date and end_date
          and o2.status <> 'CANCELLED'
        group by extract(hour from o2.created_at)
        order by orders desc
        limit 24
      ) hourly
    ) as peak_hours,
    (select avg(f.food_rating) from public.feedback f where f.created_at::date between start_date and end_date)::numeric as average_food_rating,
    (select avg(f.service_rating) from public.feedback f where f.created_at::date between start_date and end_date)::numeric as average_service_rating
  from public.orders o
  where o.created_at::date between start_date and end_date
    and o.status <> 'CANCELLED';
$$ language sql security definer;
