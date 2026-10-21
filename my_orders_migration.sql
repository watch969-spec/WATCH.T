-- All Watch: My Orders + 10-digit order number + guest tracking migration
-- Run once in Supabase SQL Editor. Existing order numbers are preserved.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1000000000;
-- Set sequence beyond current max without changing existing order numbers.
SELECT setval('public.order_number_seq', GREATEST(1000000000, COALESCE((SELECT MAX(order_number) + 1 FROM public.orders), 1000000000)), false);
UPDATE public.orders
SET order_number = nextval('public.order_number_seq')
WHERE order_number IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx ON public.orders(order_number);
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT nextval('public.order_number_seq');

-- Signed-in customers can read only their own orders; guest checkout remains enabled.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Keep the admin policy and guest insert policy already configured on orders.
CREATE OR REPLACE FUNCTION public.track_order(p_order_number BIGINT)
RETURNS TABLE (
  order_number BIGINT, status TEXT, tracking_number TEXT, courier_name TEXT,
  shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT o.order_number, o.status::text, o.tracking_number, o.courier_name,
         o.shipped_at, o.delivered_at, o.updated_at
  FROM public.orders o
  WHERE o.order_number = p_order_number
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.track_order(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(BIGINT) TO anon, authenticated;
