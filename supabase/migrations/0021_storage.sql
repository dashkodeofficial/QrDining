-- ============================================================================
-- 0021_storage.sql
-- Supabase Storage bucket and access policies for menu item images.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Public read access.
drop policy if exists "menu_images_public_select" on storage.objects;
create policy "menu_images_public_select" on storage.objects
  for select to public
  using (bucket_id = 'menu-images');

-- Authenticated staff can upload/update/delete.
drop policy if exists "menu_images_staff_write" on storage.objects;
create policy "menu_images_staff_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'menu-images')
  with check (bucket_id = 'menu-images');
