-- ============================================================================
-- 0026_voucher_batches.sql
-- Add batch_number to vouchers for batch-level generation and printing.
-- ============================================================================

alter table vouchers add column if not exists batch_number int not null default 1;

create index if not exists vouchers_batch_idx on vouchers(batch_number);
