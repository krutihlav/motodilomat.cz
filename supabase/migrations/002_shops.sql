create table if not exists shops (
  id text primary key,                 -- 'fichtlkramek'
  name text not null,
  domain text not null,
  feed_url text,
  feed_format text default 'heureka',  -- heureka | zbozi | google | custom
  shipping_price int,                  -- Kč, ručně ověřeno
  free_shipping_from int,              -- Kč, null = nemá
  affiliate_params text,               -- např. 'utm_source=motodilomat&utm_medium=cpc'
  feed_permission boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

alter table shops enable row level security;

create policy "Public can read active shops" on shops
  for select
  to anon
  using (active = true);
