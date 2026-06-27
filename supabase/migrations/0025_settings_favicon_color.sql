-- ============================================================================
-- 0025_settings_favicon_color.sql
-- Add favicon_url and primary_color to restaurant_settings.
-- Create favicons storage bucket with public read / authenticated write.
-- ============================================================================

alter table restaurant_settings
  add column if not exists favicon_url text,
  add column if not exists primary_color text default '#e23744';

-- Favicons storage bucket
insert into storage.buckets (id, name, public)
values ('favicons', 'favicons', true)
on conflict (id) do nothing;

-- Public read access
drop policy if exists "favicons_public_select" on storage.objects;
create policy "favicons_public_select" on storage.objects
  for select to public
  using (bucket_id = 'favicons');

-- Authenticated staff can upload/update/delete
drop policy if exists "favicons_staff_write" on storage.objects;
create policy "favicons_staff_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'favicons')
  with check (bucket_id = 'favicons');
