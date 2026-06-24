-- ============================================================================
-- 0001_extensions.sql
-- PostgreSQL extensions required by the restaurant QR dining schema.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
