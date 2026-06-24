-- ============================================================================
-- 0013_feedback.sql
-- Customer feedback for an order or session.
-- ============================================================================

create table if not exists feedback (
  id                uuid primary key default gen_random_uuid(),
  table_session_id  uuid not null references table_sessions(id) on delete cascade,
  order_id          uuid references orders(id) on delete set null,
  food_rating       int  not null check (food_rating between 1 and 5),
  service_rating    int  not null check (service_rating between 1 and 5),
  comment           text,
  created_at        timestamptz not null default now()
);

create index if not exists feedback_session_idx on feedback(table_session_id);

alter table feedback enable row level security;
