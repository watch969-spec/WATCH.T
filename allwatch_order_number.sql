-- All Watch: customer-facing Order Numbers like 1000000065, 1000000066, ...
-- Run once in Supabase SQL Editor.
create sequence if not exists public.orders_order_number_seq;

alter table public.orders add column if not exists order_number bigint;

select setval(
  'public.orders_order_number_seq',
  greatest(1000000064, coalesce((select max(order_number) from public.orders), 1000000064)),
  true
);

update public.orders
set order_number = nextval('public.orders_order_number_seq')
where order_number is null;

alter table public.orders
  alter column order_number
  set default nextval('public.orders_order_number_seq');

create unique index if not exists orders_order_number_unique
  on public.orders(order_number);

select setval(
  'public.orders_order_number_seq',
  greatest(1000000064, coalesce((select max(order_number) from public.orders), 1000000064)),
  true
);
