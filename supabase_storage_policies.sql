-- All Watch: Supabase Storage setup for product image uploads
-- First create a PUBLIC bucket named exactly: product-images
-- Supabase Dashboard -> Storage -> New bucket -> name: product-images -> Public bucket: ON
-- Then run the policies below in SQL Editor.
-- These policies allow authenticated users with profiles.role = 'admin' to upload.
-- Public read access is needed for getPublicUrl() image links.

create policy "Admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "Admins can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "Admins can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

-- Note: Public buckets allow public downloads by URL; keep uploads restricted to admins.
