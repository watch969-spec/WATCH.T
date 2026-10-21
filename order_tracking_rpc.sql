-- All Watch: 10-digit tracking number with tracking by number only.
-- IMPORTANT: This reassigns order numbers for ALL existing orders to 10-digit numbers.
-- Any previously shared shorter order numbers will stop working.

-- Ensure order_number is unique and generated from this sequence.
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1000000000;
ALTER SEQUENCE public.order_number_seq RESTART WITH 1000000000;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
  ON public.orders(order_number);
ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('public.order_number_seq');

-- Assign a fresh 10-digit number to every existing order.
UPDATE public.orders
SET order_number = nextval('public.order_number_seq');

-- The tracking page only returns limited delivery/status information.
CREATE OR REPLACE FUNCTION public.track_order(p_order_number BIGINT)
RETURNS TABLE (
  order_number BIGINT,
  status TEXT,
  tracking_number TEXT,
  courier_name TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    o.order_number,
    o.status::text,
    o.tracking_number,
    o.courier_name,
    o.shipped_at,
    o.delivered_at,
    o.updated_at
  FROM public.orders AS o
  WHERE o.order_number = p_order_number
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.track_order(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(BIGINT) TO anon, authenticated;
