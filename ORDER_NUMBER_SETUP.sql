-- ALL WATCH: numeric order number and safe public tracking RPC.
-- Run in Supabase SQL Editor after backing up your database.
-- Existing order numbers are preserved. Missing numbers are assigned from 1000000000.

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1000000000;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Older versions of this setup created an identity column. Use the named
-- sequence consistently so new order numbers follow the same numbering rule.
ALTER TABLE public.orders ALTER COLUMN order_number DROP IDENTITY IF EXISTS;
SELECT setval(
  'public.order_number_seq',
  GREATEST(1000000000, COALESCE((SELECT MAX(order_number) + 1 FROM public.orders), 1000000000)),
  false
);
UPDATE public.orders
SET order_number = nextval('public.order_number_seq')
WHERE order_number IS NULL;
ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('public.order_number_seq');

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
  ON public.orders(order_number);

CREATE OR REPLACE FUNCTION public.set_order_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_updated_at();

-- Public tracking returns delivery/status fields only, never customer data.
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
  SELECT o.order_number,
         o.status::TEXT,
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

-- Checkout currently requests the inserted order_number with .select().
-- Supabase must permit SELECT for the inserting role for that returning query.
-- Keep orders private; do not add a public SELECT policy to work around this.
