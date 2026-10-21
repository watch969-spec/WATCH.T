ALL WATCH — 10-DIGIT ORDER TRACKING UPDATE

Files in this ZIP:
- checkout.html: after checkout, opens tracking page with the 10-digit tracking number.
- order.html: tracking form asks only for the 10-digit number; no phone number is requested.
- admin.js: admin orders list includes order number and status options.
- order_tracking_rpc.sql: Supabase SQL setup.

SETUP
1. Download and extract this ZIP.
2. Replace checkout.html, order.html and admin.js in your GitHub repository with these files. Keep your existing supabase.js.
3. Open Supabase Dashboard → SQL Editor. Review the SQL file, then run it.
4. Wait for GitHub Pages to update, then place a test COD order. The tracking page should open with a 10-digit number.
5. Save that number. To track later, enter only that number at order.html.

IMPORTANT
- The SQL reassigns order numbers for all existing orders to 10-digit numbers. Old shorter numbers will stop working; note down new numbers from the admin orders page.
- Tracking by number only means anyone who knows/guesses a valid number may see limited status/courier information. Do not display private address, phone, email or customer name in the public tracking RPC.
- This is a simple tracking setup, not a full secure production order system.
