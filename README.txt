ALL WATCH — 6 IMAGE GALLERY UPDATE

1. Back up your existing files.
2. Run SUPABASE_6_IMAGES.sql in Supabase Dashboard > SQL Editor.
3. Replace admin.html, admin.js, product.html and index.html on your website.
4. Keep your existing style.css and supabase.js.
5. Ensure Supabase Storage has a bucket named product-images. Since getPublicUrl is used,
   make it public for displaying images, and set upload policies to allow authenticated admins.
6. Admin panel: select up to 6 images at once (each max 5 MB), then Save Product.
7. Product page shows up to 6 thumbnails; tap a thumbnail to change the main image.

Never put a service_role/secret key in browser code. If upload shows a Storage RLS error,
the bucket's Storage policies need to be corrected in Supabase.
