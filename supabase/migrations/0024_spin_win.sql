-- ============================================================================
-- 0024_spin_win.sql
-- Spin & Win feature: vouchers and rewards tables with RLS policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Rewards — configurable prizes for the spin wheel.
-- ---------------------------------------------------------------------------
create table if not exists rewards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  probability  numeric(5,2) not null default 0 check (probability >= 0 and probability <= 100),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists rewards_active_idx on rewards(active);

-- ---------------------------------------------------------------------------
-- Vouchers — admin-generated codes that customers use to spin the wheel.
-- ---------------------------------------------------------------------------
create table if not exists vouchers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  expiry_type   text not null check (expiry_type in ('WEEKLY','MONTHLY','CUSTOM')),
  expires_at    timestamptz not null,
  used_at       timestamptz,
  reward_id     uuid references rewards(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists vouchers_code_idx on vouchers(code);
create index if not exists vouchers_status_idx on vouchers(used_at);

-- ---------------------------------------------------------------------------
-- Updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists rewards_updated_at on rewards;
create trigger rewards_updated_at before update on rewards
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
alter table rewards enable row level security;
alter table vouchers enable row level security;

-- Rewards: staff can read, admins/managers can write
create policy rewards_staff_read on rewards for select to authenticated
  using (true);
create policy rewards_admin_write on rewards for all
  using (is_staff_admin()) with check (is_staff_admin());

-- Vouchers: staff can read, admins/managers can write
create policy vouchers_staff_read on vouchers for select to authenticated
  using (true);
create policy vouchers_admin_write on vouchers for all
  using (is_staff_admin()) with check (is_staff_admin());
