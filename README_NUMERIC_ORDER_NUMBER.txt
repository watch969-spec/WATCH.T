ALL WATCH — NUMERIC ORDER NUMBER FULL CODE

Files included:
- checkout.html: after placing an order, redirects using the numeric order_number.
- order.html: tracks by a 10-digit number via the `track_order` RPC.
- admin.js: admin order table and printable bill/receipt show AW-1001 style number.
- ORDER_NUMBER_SETUP.sql: adds the numeric column and safe tracking RPC.

INSTALL
1. Back up your current files and database first.
2. Supabase Dashboard > SQL Editor: run ORDER_NUMBER_SETUP.sql. It creates the `track_order` RPC used by `order.html` and preserves existing non-null order numbers.
3. Replace checkout.html, order.html and admin.js in the same folder as your existing supabase.js.
4. Confirm supabase.js contains your project's URL and public anon/publishable key. Never use a service_role/secret key.
5. Keep admin.html loading admin.js as a module and keep the existing schema/RLS policies.
6. Commit and push to GitHub Pages, wait for deployment, then test a COD order and print a receipt.

NOTES
- The database UUID `id` remains the primary key; the numeric `order_number` is the customer-facing ID.
- Orders without a number receive a 10-digit number. Existing numbers are preserved; numbers shorter than 10 digits will not pass the tracking page's 10-digit validation.
- Checkout currently uses insert(...).select(...). If your orders RLS policy does not allow SELECT for the inserted row, the insert/returning request can still fail. Do not make orders publicly readable; use a secure Edge Function/RPC to create orders if that happens.
- Tracking RPC intentionally exposes only limited status fields. Courier/tracking fields are blank until your database has and securely updates those columns.
- Test in a non-production copy first. Keep RLS enabled and never publish secret keys.
