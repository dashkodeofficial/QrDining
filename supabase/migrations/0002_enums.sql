-- ============================================================================
-- 0002_enums.sql
-- Domain enums used by the restaurant schema.
-- Idempotent DO blocks avoid errors on re-runs.
-- ============================================================================

do $$ begin
  create type table_status as enum ('AVAILABLE','OCCUPIED','BILL_REQUESTED','PAYMENT_PENDING','CLEANING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type table_session_status as enum ('ACTIVE','BILL_REQUESTED','PAYMENT_PENDING','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('PLACED','ACCEPTED','PREPARING','READY','SERVED','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type waiter_request_type as enum ('CALL_WAITER','NEED_WATER','NEED_CUTLERY','NEED_ASSISTANCE','REQUEST_BILL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type waiter_request_status as enum ('PENDING','ACKNOWLEDGED','RESOLVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_role as enum ('ADMIN','MANAGER','KITCHEN','WAITER','CASHIER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('PENDING','COMPLETED','REFUNDED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('CASH','CARD','UPI','OTHER');
exception when duplicate_object then null; end $$;
