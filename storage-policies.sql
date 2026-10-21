-- Run in Supabase SQL Editor only after confirming public.profiles has id and role columns.
-- The bucket "product-images" must exist in Storage.
-- Make the bucket PUBLIC only if product images are intended to be publicly viewable.
-- These policies restrict uploads/deletes to signed-in users whose profiles.role = 'admin'.

create policy "Admins can upload product images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "Admins can update product images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "Admins can delete product images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- If a policy with one of these names already exists, use a different name or drop
-- the old policy first. Do not enable anonymous uploads for an admin-only store.
